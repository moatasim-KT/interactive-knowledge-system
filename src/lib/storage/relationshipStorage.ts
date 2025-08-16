/**
 * Enhanced storage operations for content relationships and links
 * Provides comprehensive bidirectional linking, dependency management, and graph operations
 */
import { storage } from './indexeddb.js';
import type { ContentLink, ContentGraph, ContentGraphNode, DependencyChain, RelationshipType, SimilarityScore, ContentModule } from '$lib/types/unified';
import { difficultyToRank } from '$lib/types/unified';

export interface LinkFilter {
	sourceIds?: string[];
	targetIds?: string[];
	types?: RelationshipType[];
	strengthRange?: [number, number];
	automatic?: boolean;
	createdAfter?: Date;
	createdBefore?: Date;
}

export interface BatchLinkOperation {
	operation: 'create' | 'update' | 'delete';
	links: Partial<ContentLink>[];
}

export interface LinkAnalytics {
	totalLinks: number;
	linksByType: Record<RelationshipType, number>;
	averageStrength: number;
	automaticVsManual: { automatic: number; manual: number };
	mostConnectedNodes: Array<{ id: string; connectionCount: number }>;
	weakestLinks: ContentLink[];
	strongestLinks: ContentLink[];
}

/**
 * Enhanced relationship storage operations with advanced features
 */
export class RelationshipStorage {
	private graphCache = new Map<string, ContentGraph>();
	private dependencyCache = new Map<string, DependencyChain>();
	private analyticsCache: LinkAnalytics | null = null;
	private lastCacheUpdate = new Date(0);
	private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

	/**
	 * Create a bidirectional link with automatic reverse relationship handling
	 */
	async createLink(
		sourceId: string,
		targetId: string,
		type: RelationshipType,
		strength: number = 1.0,
		description?: string,
		automatic: boolean = false,
		skipValidation: boolean = false
	): Promise<ContentLink> {
		// Validate inputs
		if (!skipValidation) {
			await this.validateLinkCreation(sourceId, targetId, type);
		}

		const link: ContentLink = {
			id: `${sourceId}-${targetId}-${type}-${Date.now()}`,
			sourceId,
			targetId,
			type,
			strength: Math.max(0, Math.min(1, strength)), // Clamp to 0-1
			metadata: {
				created: new Date(),
				createdBy: 'current-user', // TODO: Get from user context
				description,
				automatic
			}
		};

		// Store the primary link
		await storage.add('links', link, `Created ${type} link`);

		// Create reverse link for bidirectional relationships
		if (this.isBidirectionalType(type)) {
			const reverseLink = await this.createReverseLink(link);
			await storage.add('links', reverseLink, `Created reverse ${type} link`);
		}

		// Update dependency chains for prerequisite relationships
		if (type === 'prerequisite' || type === 'dependent') {
			await this.updateDependencyChains(sourceId, targetId, type);
		}

		// Clear relevant caches
		this.invalidateCache();

		return link;
	}

	/**
	 * Create multiple links in a batch operation for efficiency
	 */
	async createLinksBatch(operations: BatchLinkOperation[]): Promise<ContentLink[]> {
		const createdLinks: ContentLink[] = [];

		for (const operation of operations) {
			if (operation.operation === 'create') {
				for (const linkData of operation.links) {
					if (linkData.sourceId && linkData.targetId && linkData.type) {
						try {
							const link = await this.createLink(
								linkData.sourceId,
								linkData.targetId,
								linkData.type,
								linkData.strength,
								linkData.metadata?.description,
								linkData.metadata?.automatic || false,
								true // Skip individual validation for batch
							);
							createdLinks.push(link);
						} catch (error) {
							console.warn(`Failed to create link in batch: ${error}`);
						}
					}
				}
			}
		}

		// Batch validate all created links for circular dependencies
		await this.validateBatchForCircularDependencies(createdLinks);

		return createdLinks;
	}

	/**
	 * Update an existing link
	 */
  async updateLink(
    linkId: string,
    updates: Partial<Pick<ContentLink, 'strength' | 'metadata'>>
  ): Promise<ContentLink | null> {
    const existingLink = await storage.get<'links'>('links', linkId);
		if (!existingLink) {return null;}

		const updatedLink: ContentLink = {
      ...(existingLink as ContentLink),
			...updates,
			metadata: {
        ...(existingLink as ContentLink).metadata,
				...updates.metadata
			}
		};

    await storage.put('links', updatedLink, 'Updated link');

		// Update reverse link if it exists
    if (this.isBidirectionalType((existingLink as ContentLink).type)) {
      const reverseId = this.getReverseId(existingLink as ContentLink);
      const reverseLink = await storage.get<'links'>('links', reverseId);
			if (reverseLink && updates.strength !== undefined) {
        const newReverse = { ...(reverseLink as ContentLink), strength: updates.strength } as ContentLink;
        await storage.put('links', newReverse, 'Updated reverse link');
			}
		}

		this.invalidateCache();
		return updatedLink;
	}

	/**
	 * Delete a link and its reverse if applicable
	 */
  async deleteLink(linkId: string): Promise<boolean> {
    const link = await storage.get<'links'>('links', linkId);
		if (!link) {return false;}

		// Delete reverse link first if it exists
    if (this.isBidirectionalType((link as ContentLink).type)) {
      const reverseId = this.getReverseId(link as ContentLink);
      await storage.delete('links', reverseId);
		}

    await storage.delete('links', linkId);

		// Update dependency chains if this was a prerequisite relationship
    if ((link as ContentLink).type === 'prerequisite' || (link as ContentLink).type === 'dependent') {
			await this.recalculateDependencyChains();
		}

		this.invalidateCache();
		return true;
	}

	/**
	 * Find all links matching the given filter criteria
	 */
  async findLinks(filter: LinkFilter = {}): Promise<ContentLink[]> {
    const allLinks = (await storage.getAll<'links'>('links')) as unknown as ContentLink[];

		return allLinks.filter(link => {
      if (filter.sourceIds && !filter.sourceIds.includes((link as ContentLink).sourceId)) {return false;}
      if (filter.targetIds && !filter.targetIds.includes((link as ContentLink).targetId)) {return false;}
      if (filter.types && !filter.types.includes((link as ContentLink).type)) {return false;}
			if (filter.strengthRange) {
				const [min, max] = filter.strengthRange;
        if ((link as ContentLink).strength < min || (link as ContentLink).strength > max) {return false;}
			}
      if (filter.automatic !== undefined && (link as ContentLink).metadata.automatic !== filter.automatic) {return false;}
      if (filter.createdAfter && (link as ContentLink).metadata.created < filter.createdAfter) {return false;}
      if (filter.createdBefore && (link as ContentLink).metadata.created > filter.createdBefore) {return false;}

			return true;
		});
	}

	/**
	 * Get all links for a specific content piece
	 */
  async getLinksForContent(contentId: string): Promise<{
		incoming: ContentLink[];
		outgoing: ContentLink[];
		all: ContentLink[]
	}> {
    const allLinks = (await storage.getAll<'links'>('links')) as unknown as ContentLink[];

    const incoming = allLinks.filter(link => (link as ContentLink).targetId === contentId) as ContentLink[];
    const outgoing = allLinks.filter(link => (link as ContentLink).sourceId === contentId) as ContentLink[];
		const all = [...incoming, ...outgoing];

		return { incoming, outgoing, all };
	}

  /**
   * Convenience: get only outgoing links for a content id
   */
  async getOutgoingLinks(contentId: string): Promise<ContentLink[]> {
    const { outgoing } = await this.getLinksForContent(contentId);
    return outgoing;
  }

  /**
   * Convenience: get only incoming links for a content id
   */
  async getIncomingLinks(contentId: string): Promise<ContentLink[]> {
    const { incoming } = await this.getLinksForContent(contentId);
    return incoming;
  }

	/**
	 * Build comprehensive content graph with caching
	 */
	async buildContentGraph(modules: ContentModule[]): Promise<ContentGraph> {
		const cacheKey = modules.map(m => m.id).sort().join('-');

		if (this.graphCache.has(cacheKey) && !this.isCacheExpired()) {
			return this.graphCache.get(cacheKey)!;
		}

		const nodes = new Map<string, ContentGraphNode>();
		const edges = new Map<string, ContentLink>();

		// Create nodes
		for (const module of modules) {
			const links = await this.getLinksForContent(module.id);

			nodes.set(module.id, {
				id: module.id,
				title: module.title,
				type: this.inferNodeType(module),
				tags: module.metadata.tags,
				difficulty: module.metadata.difficulty,
				incomingLinks: links.incoming.map(l => l.id),
				outgoingLinks: links.outgoing.map(l => l.id)
			});
		}

		// Add edges (links between existing nodes only)
		const allLinks = await this.findLinks({
			sourceIds: modules.map(m => m.id),
			targetIds: modules.map(m => m.id)
		});

		for (const link of allLinks) {
			edges.set(link.id, link);
		}

		const graph: ContentGraph = { nodes, edges };

		// Cache the result
		this.graphCache.set(cacheKey, graph);
		this.lastCacheUpdate = new Date();

		return graph;
	}

	/**
	 * Analyze dependency chains for a content piece
	 */
  async analyzeDependencyChain(contentId: string, _completedContent?: Set<string>): Promise<DependencyChain> {
		if (this.dependencyCache.has(contentId) && !this.isCacheExpired()) {
			return this.dependencyCache.get(contentId)!;
		}

		const visited = new Set<string>();
		const prerequisites = await this.getPrerequisiteChain(contentId, visited);

		visited.clear();
		const dependents = await this.getDependentChain(contentId, visited);

		const depth = await this.calculateDepth(contentId);
		const canAccess = await this.checkAccessibility(contentId);

		const chain: DependencyChain = {
			nodeId: contentId,
			prerequisites: Array.from(prerequisites),
			dependents: Array.from(dependents),
			depth,
			canAccess
		};

		this.dependencyCache.set(contentId, chain);
		return chain;
	}

	/**
	 * Detect circular dependencies in the graph
	 */
	async detectCircularDependencies(): Promise<string[][]> {
		const allLinks = await this.findLinks({ types: ['prerequisite', 'dependent'] });
		const graph = new Map<string, string[]>();

        // Build adjacency list
        for (const link of allLinks) {
			if (link.type === 'prerequisite') {
				if (!graph.has(link.targetId)) {graph.set(link.targetId, []);}
				graph.get(link.targetId)!.push(link.sourceId);
			}
		}

		const cycles: string[][] = [];
		const visited = new Set<string>();
		const recStack = new Set<string>();

		const findCycles = (node: string, path: string[]): void => {
			if (recStack.has(node)) {
				const cycleStart = path.indexOf(node);
				if (cycleStart !== -1) {
					cycles.push([...path.slice(cycleStart), node]);
				}
				return;
			}

			if (visited.has(node)) {return;}

			visited.add(node);
			recStack.add(node);
			path.push(node);

			const neighbors = graph.get(node) || [];
			for (const neighbor of neighbors) {
				findCycles(neighbor, [...path]);
			}

			recStack.delete(node);
		};

		for (const node of graph.keys()) {
			if (!visited.has(node)) {
				findCycles(node, []);
			}
		}

		return cycles;
	}

  /**
   * Alias kept for backward compatibility in services
   */
  async findCircularDependencies(): Promise<string[][]> {
    return this.detectCircularDependencies();
  }

	/**
	 * Generate automatic link suggestions based on content similarity
	 */
	async generateAutomaticLinks(
		modules: ContentModule[],
		similarityThreshold: number = 0.7,
		maxSuggestionsPerModule: number = 5
	): Promise<ContentLink[]> {
		const suggestions: ContentLink[] = [];

		for (let i = 0; i < modules.length; i++) {
			const moduleA = modules[i];
			const moduleSuggestions: Array<{ module: ContentModule; score: number; type: RelationshipType }> = [];

			for (let j = i + 1; j < modules.length; j++) {
				const moduleB = modules[j];

				// Skip if link already exists
				const existingLinks = await this.findLinks({
					sourceIds: [moduleA.id],
					targetIds: [moduleB.id]
				});
				if (existingLinks.length > 0) {continue;}

				// Calculate similarity and suggest relationship type
				const similarity = await this.calculateModuleSimilarity(moduleA, moduleB);
				if (similarity.score >= similarityThreshold) {
					const suggestedType = this.suggestRelationshipType(moduleA, moduleB, similarity);
					moduleSuggestions.push({ module: moduleB, score: similarity.score, type: suggestedType });
				}
			}

			// Sort by score and take top suggestions
			moduleSuggestions
				.sort((a, b) => b.score - a.score)
				.slice(0, maxSuggestionsPerModule)
				.forEach(suggestion => {
					suggestions.push({
						id: `auto-${moduleA.id}-${suggestion.module.id}-${suggestion.type}`,
						sourceId: moduleA.id,
						targetId: suggestion.module.id,
						type: suggestion.type,
						strength: suggestion.score,
						metadata: {
							created: new Date(),
							createdBy: 'system',
							description: `Automatically suggested based on ${Math.round(suggestion.score * 100)}% similarity`,
							automatic: true
						}
					});
				});
		}

		return suggestions;
	}

	/**
	 * Get analytics about the relationship graph
	 */
	async getAnalytics(): Promise<LinkAnalytics> {
		if (this.analyticsCache && !this.isCacheExpired()) {
			return this.analyticsCache;
		}

        const allLinks = await storage.getAll<'links'>('links') as unknown as ContentLink[];

		const totalLinks = allLinks.length;
        const linksByType: Record<RelationshipType, number> = {
            prerequisite: 0,
            dependent: 0,
            related: 0,
            similar: 0,
            sequence: 0,
            reference: 0,
            example: 0,
            practice: 0,
            follows: 0,
            references: 0,
            contradicts: 0,
            duplicate: 0,
            conceptual: 0
        };

		let totalStrength = 0;
		let automaticCount = 0;
		let manualCount = 0;
		const connectionCounts = new Map<string, number>();

		for (const link of allLinks) {
			linksByType[link.type]++;
			totalStrength += link.strength;

			if (link.metadata.automatic) {automaticCount++;}
			else {manualCount++;}

			// Count connections per node
			connectionCounts.set(link.sourceId, (connectionCounts.get(link.sourceId) || 0) + 1);
			connectionCounts.set(link.targetId, (connectionCounts.get(link.targetId) || 0) + 1);
		}

		const averageStrength = totalLinks > 0 ? totalStrength / totalLinks : 0;

		const mostConnectedNodes = Array.from(connectionCounts.entries())
			.map(([id, count]) => ({ id, connectionCount: count }))
			.sort((a, b) => b.connectionCount - a.connectionCount)
			.slice(0, 10);

		const sortedByStrength = allLinks.sort((a, b) => a.strength - b.strength);
		const weakestLinks = sortedByStrength.slice(0, 5);
		const strongestLinks = sortedByStrength.slice(-5).reverse();

		this.analyticsCache = {
			totalLinks,
			linksByType,
			averageStrength,
			automaticVsManual: { automatic: automaticCount, manual: manualCount },
			mostConnectedNodes,
			weakestLinks,
			strongestLinks
		};

		return this.analyticsCache;
	}

	/**
	 * Validate that creating a link won't cause issues
	 */
	private async validateLinkCreation(
		sourceId: string,
		targetId: string,
		type: RelationshipType
	): Promise<void> {
		if (sourceId === targetId) {
			throw new Error('Cannot create self-referential link');
		}

		// Check for existing link
		const existingLinks = await this.findLinks({
			sourceIds: [sourceId],
			targetIds: [targetId],
			types: [type]
		});

		if (existingLinks.length > 0) {
			throw new Error('Link already exists');
		}

		// Check for circular dependencies in prerequisite chains
		if (type === 'prerequisite') {
			const wouldCreateCycle = await this.wouldCreateCircularDependency(sourceId, targetId);
			if (wouldCreateCycle) {
				throw new Error('Creating this prerequisite link would create a circular dependency');
			}
		}
	}

	/**
	 * Check if creating a prerequisite link would create a circular dependency
	 */
	private async wouldCreateCircularDependency(sourceId: string, targetId: string): Promise<boolean> {
		const visited = new Set<string>();
		return await this.hasPath(targetId, sourceId, visited, ['prerequisite']);
	}

	/**
	 * Check if there's a path from start to end through given relationship types
	 */
	private async hasPath(
		startId: string,
		endId: string,
		visited: Set<string>,
		relationshipTypes: RelationshipType[]
	): Promise<boolean> {
		if (startId === endId) {return true;}
		if (visited.has(startId)) {return false;}

		visited.add(startId);

		const links = await this.findLinks({
			sourceIds: [startId],
			types: relationshipTypes
		});

		for (const link of links) {
			if (await this.hasPath(link.targetId, endId, visited, relationshipTypes)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Create reverse link for bidirectional relationships
	 */
	private async createReverseLink(originalLink: ContentLink): Promise<ContentLink> {
		return {
			...originalLink,
			id: this.getReverseId(originalLink),
			sourceId: originalLink.targetId,
			targetId: originalLink.sourceId,
			type: this.getReverseType(originalLink.type)
		};
	}

	/**
	 * Generate reverse link ID
	 */
	private getReverseId(link: ContentLink): string {
		return `${link.targetId}-${link.sourceId}-${link.type}-reverse`;
	}

	/**
	 * Get reverse relationship type
	 */
	private getReverseType(type: RelationshipType): RelationshipType {
		switch (type) {
			case 'prerequisite': return 'dependent';
			case 'dependent': return 'prerequisite';
			case 'related': return 'related';
			case 'similar': return 'similar';
			default: return type;
		}
	}

	/**
	 * Check if a relationship type is bidirectional
	 */
	private isBidirectionalType(type: RelationshipType): boolean {
		return ['related', 'similar', 'prerequisite'].includes(type);
	}

	/**
	 * Infer node type from module content
	 */
	private inferNodeType(module: ContentModule): 'module' | 'lesson' | 'concept' {
		const blockCount = module.blocks.length;
		const hasQuiz = module.blocks.some(b => b.type === 'quiz');

		if (blockCount > 10 || hasQuiz) {return 'module';}
		if (blockCount > 3) {return 'lesson';}
		return 'concept';
	}

	/**
	 * Calculate content similarity between two modules
	 */
	private async calculateModuleSimilarity(
		moduleA: ContentModule,
		moduleB: ContentModule
	): Promise<SimilarityScore> {
		// Simple similarity calculation - can be enhanced
		let score = 0;
		let factors = 0;

		// Tag similarity
		const commonTags = moduleA.metadata.tags.filter(tag =>
			moduleB.metadata.tags.includes(tag)
		);
		const tagSimilarity = commonTags.length /
			Math.max(moduleA.metadata.tags.length, moduleB.metadata.tags.length, 1);
		score += tagSimilarity * 0.4;
		factors += 0.4;

		// Difficulty similarity
        const difficultyDiff = Math.abs(difficultyToRank(moduleA.metadata.difficulty) - difficultyToRank(moduleB.metadata.difficulty));
		const difficultySimilarity = Math.max(0, 1 - (difficultyDiff / 10));
		score += difficultySimilarity * 0.3;
		factors += 0.3;

		// Content type similarity
		const typesSimilarity = this.calculateContentTypeSimilarity(moduleA, moduleB);
		score += typesSimilarity * 0.3;
		factors += 0.3;

		return {
			contentId: moduleB.id,
			score: factors > 0 ? score / factors : 0,
			reasons: [
				{
					type: 'tags',
					score: tagSimilarity,
					details: `Common tags: ${commonTags.join(', ')}`
				},
				{
					type: 'difficulty',
					score: difficultySimilarity,
					details: `Difficulty difference: ${difficultyDiff}`
				},
				{
					type: 'content',
					score: typesSimilarity,
					details: 'Content type similarity'
				}
			]
		};
	}

	/**
	 * Calculate similarity in content types between modules
	 */
	private calculateContentTypeSimilarity(moduleA: ContentModule, moduleB: ContentModule): number {
		const typesA = new Set(moduleA.blocks.map(b => b.type));
		const typesB = new Set(moduleB.blocks.map(b => b.type));

		const intersection = new Set([...typesA].filter(type => typesB.has(type)));
		const union = new Set([...typesA, ...typesB]);

		return union.size > 0 ? intersection.size / union.size : 0;
	}

	/**
	 * Suggest relationship type based on module comparison
	 */
	private suggestRelationshipType(
		moduleA: ContentModule,
		moduleB: ContentModule,
		similarity: SimilarityScore
	): RelationshipType {
        const difficultyDiff = difficultyToRank(moduleB.metadata.difficulty) - difficultyToRank(moduleA.metadata.difficulty);

		// If B is significantly harder, suggest A as prerequisite for B
		if (difficultyDiff >= 2) {return 'prerequisite';}

		// If very similar difficulty and high similarity, suggest related
		if (Math.abs(difficultyDiff) <= 1 && similarity.score >= 0.8) {return 'related';}

		// If similar content types, suggest similar
		const contentTypeSimilarity = this.calculateContentTypeSimilarity(moduleA, moduleB);
		if (contentTypeSimilarity >= 0.6) {return 'similar';}

		// Default to related
		return 'related';
	}

	/**
	 * Get prerequisite chain for a content piece
	 */
	private async getPrerequisiteChain(contentId: string, visited: Set<string>): Promise<Set<string>> {
		if (visited.has(contentId)) {return new Set();}
		visited.add(contentId);

		const prerequisites = new Set<string>();
		const links = await this.findLinks({
			targetIds: [contentId],
			types: ['prerequisite']
		});

		for (const link of links) {
			prerequisites.add(link.sourceId);
			const chainPrereqs = await this.getPrerequisiteChain(link.sourceId, visited);
			chainPrereqs.forEach(prereq => prerequisites.add(prereq));
		}

		return prerequisites;
	}

	/**
	 * Get dependent chain for a content piece
	 */
	private async getDependentChain(contentId: string, visited: Set<string>): Promise<Set<string>> {
		if (visited.has(contentId)) {return new Set();}
		visited.add(contentId);

		const dependents = new Set<string>();
		const links = await this.findLinks({
			sourceIds: [contentId],
			types: ['prerequisite']
		});

		for (const link of links) {
			dependents.add(link.targetId);
			const chainDependents = await this.getDependentChain(link.targetId, visited);
			chainDependents.forEach(dependent => dependents.add(dependent));
		}

		return dependents;
	}

	/**
	 * Calculate depth in dependency tree
	 */
	private async calculateDepth(contentId: string): Promise<number> {
		const links = await this.findLinks({
			targetIds: [contentId],
			types: ['prerequisite']
		});

		if (links.length === 0) {return 0;}

		let maxDepth = 0;
		for (const link of links) {
			const depth = await this.calculateDepth(link.sourceId);
			maxDepth = Math.max(maxDepth, depth);
		}

		return maxDepth + 1;
	}

	/**
	 * Check if content is accessible based on completed prerequisites
	 */
	private async checkAccessibility(contentId: string): Promise<boolean> {
		// This would need integration with user progress tracking
		// For now, return true - implement based on your user system
		return true;
	}

	/**
	 * Update dependency chains when prerequisite relationships change
	 */
	private async updateDependencyChains(sourceId: string, targetId: string, type: RelationshipType): Promise<void> {
		// Invalidate affected dependency caches
		this.dependencyCache.delete(sourceId);
		this.dependencyCache.delete(targetId);
	}

	/**
	 * Recalculate all dependency chains
	 */
	private async recalculateDependencyChains(): Promise<void> {
		this.dependencyCache.clear();
	}

	/**
	 * Validate batch operations for circular dependencies
	 */
	private async validateBatchForCircularDependencies(links: ContentLink[]): Promise<void> {
		// Create temporary graph with new links
		const prereqLinks = links.filter(l => l.type === 'prerequisite');
		if (prereqLinks.length === 0) {return;}

		// Check for cycles in the batch
		const graph = new Map<string, Set<string>>();
		prereqLinks.forEach(link => {
			if (!graph.has(link.targetId)) {graph.set(link.targetId, new Set());}
			graph.get(link.targetId)!.add(link.sourceId);
		});

		// Simple cycle detection for batch
		for (const [node, prereqs] of graph.entries()) {
			if (this.hasCycleInBatch(node, prereqs, graph, new Set())) {
				throw new Error(`Batch operation would create circular dependency involving ${node}`);
			}
		}
	}

	/**
	 * Check for cycles in batch operation
	 */
	private hasCycleInBatch(
		node: string,
		prereqs: Set<string>,
		graph: Map<string, Set<string>>,
		visited: Set<string>
	): boolean {
		if (visited.has(node)) {return true;}
		visited.add(node);

		for (const prereq of prereqs) {
			const prereqNodes = graph.get(prereq);
			if (prereqNodes && this.hasCycleInBatch(prereq, prereqNodes, graph, new Set(visited))) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if cache has expired
	 */
	private isCacheExpired(): boolean {
		return Date.now() - this.lastCacheUpdate.getTime() > this.cacheTimeout;
	}

	/**
	 * Invalidate all caches
	 */
	private invalidateCache(): void {
		this.graphCache.clear();
		this.dependencyCache.clear();
		this.analyticsCache = null;
	}

	/**
	 * Clear all caches manually
	 */
	public clearCaches(): void {
		this.invalidateCache();
	}
}

// Export singleton instance
export const relationshipStorage = new RelationshipStorage();
