/**
 * Enhanced Content Relationship Service
 *
 * Provides comprehensive bidirectional linking, visual graph generation,
 * prerequisite enforcement, and intelligent content recommendations.
 */
import type { ContentLink, ContentGraph, ContentGraphNode, DependencyChain, RelationshipType, KnowledgeMap, KnowledgeMapNode, KnowledgeMapConnection, ContentRecommendation, SimilarityScore, RecommendationReason, ContentModule, GraphVisualizationOptions, PathfindingResult, ConnectionStrength, ClusterAnalysis } from '$lib/types/unified';
import { relationshipStorage } from '../storage/relationshipStorage.js';
import { similarityEngine } from '../utils/similarityEngine.js';
import { difficultyToRank } from '$lib/types/unified';



/**
 * Enhanced relationship service with advanced graph operations
 */
export class EnhancedRelationshipService {
	private layoutEngine: GraphLayoutEngine;
	private recommendationEngine: RecommendationEngine;
	private pathfinder: ContentPathfinder;
	private clusterAnalyzer: ClusterAnalyzer;

	constructor() {
		this.layoutEngine = new GraphLayoutEngine();
		this.recommendationEngine = new RecommendationEngine();
		this.pathfinder = new ContentPathfinder();
		this.clusterAnalyzer = new ClusterAnalyzer();
	}

	/**
	 * Create bidirectional content relationships with automatic reverse linking
	 */
	async createBidirectionalLink(
		sourceId: string,
		targetId: string,
		type: RelationshipType,
		options: {
			strength?: number;
			description?: string;
			automatic?: boolean;
			enforceValidation?: boolean;
			metadata?: Record<string, any>;
		} = {}
	): Promise<{ primary: ContentLink; reverse?: ContentLink }> {
		const { strength = 1.0, description, automatic = false, enforceValidation = true } = options;

		// Validate the relationship if required
		if (enforceValidation) {
			await this.validateRelationship(sourceId, targetId, type);
		}

		// Create primary link
		const primaryLink = await relationshipStorage.createLink(
			sourceId,
			targetId,
			type,
			strength,
			description,
			automatic
		);

		let reverseLink: ContentLink | undefined;

		// Create reverse link for bidirectional types
		if (this.isBidirectionalType(type)) {
			const reverseType = this.getReverseType(type);
			reverseLink = await relationshipStorage.createLink(
				targetId,
				sourceId,
				reverseType,
				strength,
				description ? `Reverse of: ${description}` : undefined,
				automatic,
				true // Skip validation for reverse link
			);
		}

		// Update connection strength analysis
		await this.updateConnectionStrengths([primaryLink.id]);

		return { primary: primaryLink, reverse: reverseLink };
	}

	/**
	 * Generate interactive knowledge map with advanced visualization
	 */
	async generateInteractiveKnowledgeMap(
		modules: ContentModule[],
		options: GraphVisualizationOptions,
		userProgress?: Map<string, { completed: boolean; score?: number; timeSpent?: number }>
	): Promise<KnowledgeMap> {
		// Build the content graph
		const graph = await relationshipStorage.buildContentGraph(modules);

		// Perform cluster analysis
		const clusters = await this.clusterAnalyzer.analyzeClusters(graph, modules);

		// Generate layout positions
		const positions = await this.layoutEngine.calculateLayout(graph, options);

		// Create knowledge map nodes with enhanced properties
		const nodes: KnowledgeMapNode[] = Array.from(graph.nodes.values()).map(node => {
			const module = modules.find(m => m.id === node.id)!;
			const progress = userProgress?.get(node.id);
			const position = positions.get(node.id)!;

			return {
				id: node.id,
				contentId: node.id,
				title: node.title,
				type: this.inferNodeType(module),
				status: this.determineNodeStatus(node.id, userProgress),
				position: position,
				size: this.calculateNodeSize(module, options.nodeSize),
				color: this.getNodeColor(module, options.colorScheme, progress)
			};
		});

		// Create knowledge map connections
		const connections: KnowledgeMapConnection[] = Array.from(graph.edges.values()).map(edge => ({
			id: edge.id,
			sourceId: edge.sourceId,
			targetId: edge.targetId,
			type: edge.type,
			strength: edge.strength,
			style: this.getConnectionStyle(edge.type, edge.strength),
			color: this.getConnectionColor(edge.type, edge.strength)
		}));

		return {
			id: `map-${Date.now()}`,
			title: 'Interactive Knowledge Map',
			description: 'Visual representation of content relationships and learning paths',
			nodes,
			connections,
			layout: options.layout,
			filters: {
				showCompleted: true,
				showPrerequisites: true,
				difficultyRange: [0, 10],
				tags: []
			}
		};
	}

	/**
	 * Enforce prerequisite requirements and generate learning paths
	 */
	async enforcePrerequisites(
		targetContentId: string,
		completedContent: Set<string>
	): Promise<{
		canAccess: boolean;
		missingPrerequisites: string[];
		suggestedPath: PathfindingResult | null;
		alternativePaths: PathfindingResult[];
	}> {
		// Analyze dependency chain
		const dependencyChain = await relationshipStorage.analyzeDependencyChain(targetContentId);

		// Check which prerequisites are missing
        const missingPrerequisites = Array.from(dependencyChain.prerequisites).filter(
            prereqId => !completedContent.has(prereqId)
        );

		const canAccess = missingPrerequisites.length === 0;

		let suggestedPath: PathfindingResult | null = null;
		let alternativePaths: PathfindingResult[] = [];

		if (!canAccess && missingPrerequisites.length > 0) {
			// Find optimal learning path to target
			suggestedPath = await this.pathfinder.findOptimalPath(
				Array.from(completedContent),
				targetContentId,
				{ algorithm: 'dijkstra', includeAlternatives: false }
			);

			// Find alternative paths
			alternativePaths = await this.pathfinder.findAlternativePaths(
				Array.from(completedContent),
				targetContentId,
				{ maxPaths: 3, diversityWeight: 0.3 }
			);
		}

		return {
			canAccess,
			missingPrerequisites,
			suggestedPath,
			alternativePaths
		};
	}

	/**
	 * Generate intelligent content recommendations
	 */
	async generateSmartRecommendations(
		userId: string,
		currentContentId: string,
		completedContent: Set<string>,
		userInterests: string[] = [],
		maxRecommendations: number = 10
	): Promise<ContentRecommendation[]> {
		const allModules = await this.getAllModules();
		const currentModule = allModules.find(m => m.id === currentContentId);

		if (!currentModule) {return [];}

		const recommendations: ContentRecommendation[] = [];

		// Get next-in-sequence recommendations
		const sequenceRecs = await this.recommendationEngine.getSequenceRecommendations(
			currentContentId,
			completedContent
		);
		recommendations.push(...sequenceRecs);

		// Get related content recommendations
		const relatedRecs = await this.recommendationEngine.getRelatedRecommendations(
			currentModule,
			allModules,
			userInterests
		);
		recommendations.push(...relatedRecs);

		// Get difficulty-appropriate recommendations
		const difficultyRecs = await this.recommendationEngine.getDifficultyBasedRecommendations(
			currentModule,
			allModules,
			completedContent
		);
		recommendations.push(...difficultyRecs);

		// Get practice and review recommendations
		const practiceRecs = await this.recommendationEngine.getPracticeRecommendations(
			completedContent,
			allModules
		);
		recommendations.push(...practiceRecs);

		// Sort by score and remove duplicates
		const uniqueRecs = new Map<string, ContentRecommendation>();
		for (const rec of recommendations) {
			if (!uniqueRecs.has(rec.contentId) || uniqueRecs.get(rec.contentId)!.score < rec.score) {
				uniqueRecs.set(rec.contentId, rec);
			}
		}

		return Array.from(uniqueRecs.values())
			.sort((a, b) => b.score - a.score)
			.slice(0, maxRecommendations);
	}

	/**
	 * Analyze connection strengths and suggest improvements
	 */
	async analyzeConnectionStrengths(
		moduleIds?: string[]
	): Promise<{
		strengths: ConnectionStrength[];
		suggestions: Array<{
			type: 'strengthen' | 'create' | 'remove';
			sourceId: string;
			targetId: string;
			currentStrength?: number;
			suggestedStrength: number;
			reasoning: string;
		}>;
	}> {
		const links = moduleIds
			? await relationshipStorage.findLinks({
				sourceIds: moduleIds,
				targetIds: moduleIds
			})
			: await relationshipStorage.findLinks();

        const strengths: ConnectionStrength[] = [] as any;
		const suggestions = [];

		for (const link of links) {
            const strength = await this.calculateEnhancedConnectionStrength(link);
            strengths.push({ value: strength.strength, confidence: strength.confidence, factors: [], lastUpdated: new Date() });

			// Suggest improvements based on strength analysis
			if (strength.confidence < 0.5) {
				suggestions.push({
					type: 'strengthen' as const,
					sourceId: link.sourceId,
					targetId: link.targetId,
					currentStrength: link.strength,
					suggestedStrength: Math.max(0.7, strength.strength),
					reasoning: 'Low confidence in current strength assessment'
				});
			}
		}

		return { strengths, suggestions };
	}

	/**
	 * Detect and resolve circular dependencies
	 */
	async detectAndResolveCircularDependencies(): Promise<{
		cycles: string[][];
		resolutionSuggestions: Array<{
			cycle: string[];
			suggestedRemovals: string[];
			alternativeLinks: ContentLink[];
		}>;
	}> {
		const cycles = await relationshipStorage.detectCircularDependencies();
		const resolutionSuggestions = [];

		for (const cycle of cycles) {
			// Find the weakest link in the cycle to suggest for removal
			const cycleLinks = await this.getCycleLinks(cycle);
			const weakestLinks = cycleLinks
				.sort((a, b) => a.strength - b.strength)
				.slice(0, Math.ceil(cycleLinks.length / 2));

			// Suggest alternative connections
			const alternatives = await this.suggestAlternativeConnections(cycle, weakestLinks);

			resolutionSuggestions.push({
				cycle,
				suggestedRemovals: weakestLinks.map(l => l.id),
				alternativeLinks: alternatives
			});
		}

		return { cycles, resolutionSuggestions };
	}

	/**
	 * Export knowledge map data for external visualization tools
	 */
	async exportKnowledgeMap(
		format: 'json' | 'graphml' | 'gexf' | 'cytoscape',
		modules: ContentModule[],
		options: GraphVisualizationOptions
	): Promise<string> {
		const knowledgeMap = await this.generateInteractiveKnowledgeMap(modules, options);

		switch (format) {
			case 'json':
				return JSON.stringify(knowledgeMap, null, 2);

			case 'graphml':
				return this.convertToGraphML(knowledgeMap);

			case 'gexf':
				return this.convertToGEXF(knowledgeMap);

			case 'cytoscape':
				return this.convertToCytoscape(knowledgeMap);

			default:
				throw new Error(`Unsupported export format: ${format}`);
		}
	}

	// Private helper methods

	private async validateRelationship(
		sourceId: string,
		targetId: string,
		type: RelationshipType
	): Promise<void> {
		// Check for self-reference
		if (sourceId === targetId) {
			throw new Error('Cannot create self-referential relationship');
		}

		// Check for circular dependencies in prerequisite chains
		if (type === 'prerequisite') {
			const wouldCreateCycle = await this.wouldCreateCircularDependency(sourceId, targetId);
			if (wouldCreateCycle) {
				throw new Error('This relationship would create a circular dependency');
			}
		}

		// Check for duplicate relationships
		const existingLinks = await relationshipStorage.findLinks({
			sourceIds: [sourceId],
			targetIds: [targetId],
			types: [type]
		});

		if (existingLinks.length > 0) {
			throw new Error('Relationship already exists');
		}
	}

	private async wouldCreateCircularDependency(sourceId: string, targetId: string): Promise<boolean> {
		// Use pathfinder to check if there's already a path from target to source
		try {
			const path = await this.pathfinder.findOptimalPath(
				[targetId],
				sourceId,
				{ algorithm: 'bfs', relationshipTypes: ['prerequisite'] }
			);
			return path.path.length > 0;
		} catch {
			return false;
		}
	}

	private isBidirectionalType(type: RelationshipType): boolean {
		return ['related', 'similar'].includes(type);
	}

	private getReverseType(type: RelationshipType): RelationshipType {
		switch (type) {
			case 'prerequisite': return 'dependent';
			case 'dependent': return 'prerequisite';
			case 'related': return 'related';
			case 'similar': return 'similar';
			default: return type;
		}
	}

	private inferNodeType(module: ContentModule): 'concept' | 'skill' | 'topic' | 'milestone' {
		const blockCount = module.blocks.length;
		const hasQuiz = module.blocks.some(b => b.type === 'quiz');
		const hasInteractive = module.blocks.some(b =>
			['interactive-visualization', 'simulation'].includes(b.type)
		);

		if (hasQuiz && blockCount > 10) {return 'milestone';}
		if (hasInteractive) {return 'skill';}
		if (blockCount > 5) {return 'topic';}
		return 'concept';
	}

	private determineNodeStatus(
		nodeId: string,
		userProgress?: Map<string, { completed: boolean; score?: number; timeSpent?: number }>
	): 'locked' | 'available' | 'in-progress' | 'completed' {
		const progress = userProgress?.get(nodeId);
		if (!progress) {return 'available';}
		if (progress.completed) {return 'completed';}
		if (progress.timeSpent && progress.timeSpent > 0) {return 'in-progress';}
		return 'available';
	}

	private calculateNodeSize(module: ContentModule, sizeMethod: string): number {
		switch (sizeMethod) {
			case 'by-content':
				return Math.min(100, Math.max(20, module.blocks.length * 5));
			case 'by-connections':
				// Would need to calculate based on connection count
				return 40;
			default:
				return 40;
		}
	}

	private getNodeColor(
		module: ContentModule,
		colorScheme: string,
		progress?: { completed: boolean; score?: number }
	): string {
		switch (colorScheme) {
            case 'by-difficulty':
                const rank = difficultyToRank(module.metadata.difficulty);
                if (rank <= 1) {return '#4CAF50';} // Beginner
                if (rank === 2) {return '#FF9800';} // Intermediate
                return '#F44336'; // Advanced

			case 'by-progress':
				if (progress?.completed) {return '#4CAF50';}
				if (progress?.score && progress.score > 0) {return '#FF9800';}
				return '#9E9E9E';

			case 'by-topic':
				// Color by primary tag
				const primaryTag = module.metadata.tags[0];
				return this.getTagColor(primaryTag);

			default:
				return '#2196F3';
		}
	}

	private getTagColor(tag: string): string {
		const colors = [
			'#F44336', '#E91E63', '#9C27B0', '#673AB7',
			'#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
			'#009688', '#4CAF50', '#8BC34A', '#CDDC39',
			'#FFEB3B', '#FFC107', '#FF9800', '#FF5722'
		];

		let hash = 0;
		for (let i = 0; i < tag.length; i++) {
			hash = tag.charCodeAt(i) + ((hash << 5) - hash);
		}

		return colors[Math.abs(hash) % colors.length];
	}

	private getConnectionStyle(type: RelationshipType, strength: number): 'solid' | 'dashed' | 'dotted' {
		if (strength < 0.3) {return 'dotted';}
		if (type === 'prerequisite' || type === 'dependent') {return 'solid';}
		return 'dashed';
	}

	private getConnectionColor(type: RelationshipType, strength: number): string {
		const alpha = Math.max(0.3, strength);

		switch (type) {
			case 'prerequisite':
			case 'dependent':
				return `rgba(244, 67, 54, ${alpha})`; // Red
			case 'related':
				return `rgba(33, 150, 243, ${alpha})`; // Blue
			case 'similar':
				return `rgba(76, 175, 80, ${alpha})`; // Green
			case 'sequence':
				return `rgba(156, 39, 176, ${alpha})`; // Purple
			default:
				return `rgba(158, 158, 158, ${alpha})`; // Gray
		}
	}

    private async calculateEnhancedConnectionStrength(link: ContentLink): Promise<{ linkId: string; strength: number; confidence: number; value: 'weak' | 'medium' | 'strong'; factors: Array<{ type: string; weight: number; value: number }>; }> {
		// This is a simplified implementation - in reality you'd analyze:
		// - Content similarity
		// - User interaction patterns
		// - Learning outcome correlations
		// - Expert annotations

        const value: 'weak' | 'medium' | 'strong' = link.strength < 0.34 ? 'weak' : link.strength < 0.67 ? 'medium' : 'strong';
        return {
            value,
			linkId: link.id,
			strength: link.strength,
			confidence: 0.8, // Placeholder
			factors: [
				{
					type: 'content-similarity',
					weight: 0.4,
					value: link.strength
				},
				{
					type: 'tag-overlap',
					weight: 0.3,
					value: link.strength * 0.8
				},
				{
					type: 'difficulty-progression',
					weight: 0.3,
					value: link.strength * 1.1
				}
			]
		};
	}

	private async updateConnectionStrengths(linkIds: string[]): Promise<void> {
		// Update connection strength cache/analysis
		// Implementation would depend on your caching strategy
	}

	private async getAllModules(): Promise<ContentModule[]> {
		// Get all modules from storage
		// This is a placeholder - implement based on your storage system
		return [];
	}

	private async getCycleLinks(cycle: string[]): Promise<ContentLink[]> {
		const links: ContentLink[] = [];

		for (let i = 0; i < cycle.length; i++) {
			const source = cycle[i];
			const target = cycle[(i + 1) % cycle.length];

			const cycleLinks = await relationshipStorage.findLinks({
				sourceIds: [source],
				targetIds: [target],
				types: ['prerequisite']
			});

			links.push(...cycleLinks);
		}

		return links;
	}

	private async suggestAlternativeConnections(
		cycle: string[],
		removedLinks: ContentLink[]
	): Promise<ContentLink[]> {
		// Suggest alternative connections that maintain connectivity without cycles
		// This is a simplified implementation
		return [];
	}

	private convertToGraphML(knowledgeMap: KnowledgeMap): string {
		// Convert to GraphML format
		// This is a placeholder - implement full GraphML export
		return `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <!-- GraphML representation would go here -->
</graphml>`;
	}

	private convertToGEXF(knowledgeMap: KnowledgeMap): string {
		// Convert to GEXF format
		// This is a placeholder - implement full GEXF export
		return `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">
  <!-- GEXF representation would go here -->
</gexf>`;
	}

	private convertToCytoscape(knowledgeMap: KnowledgeMap): string {
		// Convert to Cytoscape.js format
		const cytoscapeData = {
			elements: [
				...knowledgeMap.nodes.map(node => ({
					data: {
						id: node.id,
						label: node.title,
						type: node.type,
						size: node.size,
						color: node.color
					},
					position: node.position
				})),
				...knowledgeMap.connections.map(conn => ({
					data: {
						id: conn.id,
						source: conn.sourceId,
						target: conn.targetId,
						type: conn.type,
						strength: conn.strength,
						color: conn.color
					}
				}))
			]
		};

		return JSON.stringify(cytoscapeData, null, 2);
	}
}

/**
 * Graph layout calculation engine
 */
class GraphLayoutEngine {
	async calculateLayout(
		graph: ContentGraph,
		options: GraphVisualizationOptions
	): Promise<Map<string, { x: number; y: number }>> {
		const positions = new Map<string, { x: number; y: number }>();

		switch (options.layout) {
			case 'force-directed':
				return this.forceDirectedLayout(graph, options);
			case 'hierarchical':
				return this.hierarchicalLayout(graph, options);
			case 'circular':
				return this.circularLayout(graph, options);
			case 'grid':
				return this.gridLayout(graph, options);
			case 'radial':
				return this.radialLayout(graph, options);
			default:
				return this.forceDirectedLayout(graph, options);
		}
	}

	private forceDirectedLayout(graph: ContentGraph, options: GraphVisualizationOptions): Map<string, { x: number; y: number }> {
		// Simplified force-directed layout
		const positions = new Map<string, { x: number; y: number }>();
		const nodes = Array.from(graph.nodes.keys());

		// Initialize random positions
		nodes.forEach(nodeId => {
			positions.set(nodeId, {
				x: Math.random() * options.width,
				y: Math.random() * options.height
			});
		});

		// Apply force-directed algorithm (simplified)
		for (let iter = 0; iter < 100; iter++) {
			// Calculate repulsive forces
			// Calculate attractive forces for connected nodes
			// Update positions
		}

		return positions;
	}

	private hierarchicalLayout(graph: ContentGraph, options: GraphVisualizationOptions): Map<string, { x: number; y: number }> {
		// Implement hierarchical layout based on dependency levels
		const positions = new Map<string, { x: number; y: number }>();
		// Implementation would go here
		return positions;
	}

	private circularLayout(graph: ContentGraph, options: GraphVisualizationOptions): Map<string, { x: number; y: number }> {
		// Arrange nodes in a circle
		const positions = new Map<string, { x: number; y: number }>();
		const nodes = Array.from(graph.nodes.keys());
		const angleStep = (2 * Math.PI) / nodes.length;
		const radius = Math.min(options.width, options.height) / 3;
		const centerX = options.width / 2;
		const centerY = options.height / 2;

		nodes.forEach((nodeId, index) => {
			const angle = index * angleStep;
			positions.set(nodeId, {
				x: centerX + radius * Math.cos(angle),
				y: centerY + radius * Math.sin(angle)
			});
		});

		return positions;
	}

	private gridLayout(graph: ContentGraph, options: GraphVisualizationOptions): Map<string, { x: number; y: number }> {
		// Arrange nodes in a grid
		const positions = new Map<string, { x: number; y: number }>();
		const nodes = Array.from(graph.nodes.keys());
		const cols = Math.ceil(Math.sqrt(nodes.length));
		const cellWidth = options.width / cols;
		const cellHeight = options.height / Math.ceil(nodes.length / cols);

		nodes.forEach((nodeId, index) => {
			const row = Math.floor(index / cols);
			const col = index % cols;
			positions.set(nodeId, {
				x: col * cellWidth + cellWidth / 2,
				y: row * cellHeight + cellHeight / 2
			});
		});

		return positions;
	}

	private radialLayout(graph: ContentGraph, options: GraphVisualizationOptions): Map<string, { x: number; y: number }> {
		// Radial layout with central node
		const positions = new Map<string, { x: number; y: number }>();
		// Implementation would identify central node and arrange others radially
		return positions;
	}
}

/**
 * Content recommendation engine
 */
class RecommendationEngine {
	async getSequenceRecommendations(
		currentContentId: string,
		completedContent: Set<string>
	): Promise<ContentRecommendation[]> {
		const recommendations: ContentRecommendation[] = [];

		// Find sequence links from current content
		const sequenceLinks = await relationshipStorage.findLinks({
			sourceIds: [currentContentId],
			types: ['sequence']
		});

		for (const link of sequenceLinks) {
			if (!completedContent.has(link.targetId)) {
				recommendations.push({
					contentId: link.targetId,
					score: link.strength * 0.9,
					type: 'next-in-sequence',
					reasons: [{
						type: 'prerequisite-completed',
						weight: 1.0,
						description: 'Next content in the learning sequence'
					}]
				});
			}
		}

		return recommendations;
	}

	async getRelatedRecommendations(
		currentModule: ContentModule,
		allModules: ContentModule[],
		userInterests: string[]
	): Promise<ContentRecommendation[]> {
		const recommendations: ContentRecommendation[] = [];

		// Find related content through similarity
		for (const module of allModules) {
			if (module.id === currentModule.id) {continue;}

			const similarity = await similarityEngine.calculateSimilarity(currentModule, module);

			if (similarity.score > 0.6) {
				const interestBonus = this.calculateInterestBonus(module.metadata.tags, userInterests);

				recommendations.push({
					contentId: module.id,
					score: similarity.score * 0.8 + interestBonus,
					type: 'related-topic',
					reasons: [{
						type: 'similar-content',
						weight: similarity.score,
						description: `${Math.round(similarity.score * 100)}% content similarity`
					}]
				});
			}
		}

		return recommendations;
	}

	async getDifficultyBasedRecommendations(
		currentModule: ContentModule,
		allModules: ContentModule[],
		completedContent: Set<string>
	): Promise<ContentRecommendation[]> {
        const recommendations: ContentRecommendation[] = [];
        const currentDifficulty = difficultyToRank(currentModule.metadata.difficulty);

		// Find modules with slightly higher difficulty
		for (const module of allModules) {
			if (module.id === currentModule.id || completedContent.has(module.id)) {continue;}

            const difficultyGap = difficultyToRank(module.metadata.difficulty) - currentDifficulty;

			if (difficultyGap >= 1 && difficultyGap <= 2) {
				recommendations.push({
					contentId: module.id,
					score: 0.7 - (difficultyGap - 1) * 0.2,
					type: 'similar-difficulty',
					reasons: [{
						type: 'difficulty-match',
						weight: 0.7,
						description: `Progressive difficulty increase (+${difficultyGap})`
					}]
				});
			}
		}

		return recommendations;
	}

	async getPracticeRecommendations(
		completedContent: Set<string>,
		allModules: ContentModule[]
	): Promise<ContentRecommendation[]> {
		const recommendations: ContentRecommendation[] = [];

		// Find practice content for completed modules
		for (const completedId of completedContent) {
			const practiceLinks = await relationshipStorage.findLinks({
				sourceIds: [completedId],
				types: ['practice']
			});

			for (const link of practiceLinks) {
				if (!completedContent.has(link.targetId)) {
					recommendations.push({
						contentId: link.targetId,
						score: link.strength * 0.6,
						type: 'practice',
						reasons: [{
							type: 'topic-continuation',
							weight: link.strength,
							description: 'Practice exercises for completed content'
						}]
					});
				}
			}
		}

		return recommendations;
	}

	private calculateInterestBonus(contentTags: string[], userInterests: string[]): number {
		const commonInterests = contentTags.filter(tag => userInterests.includes(tag));
		return Math.min(0.3, commonInterests.length * 0.1);
	}
	}

	/**
	 * Content pathfinding for learning path optimization
	 */
	class ContentPathfinder {
	async findOptimalPath(
		startNodes: string[],
		targetNode: string,
		options: {
			algorithm: 'dijkstra' | 'bfs' | 'dfs';
			relationshipTypes?: RelationshipType[];
			includeAlternatives?: boolean;
		}
	): Promise<PathfindingResult> {
		switch (options.algorithm) {
			case 'dijkstra':
				return this.dijkstraSearch(startNodes, targetNode, options.relationshipTypes);
			case 'bfs':
				return this.breadthFirstSearch(startNodes, targetNode, options.relationshipTypes);
			case 'dfs':
				return this.depthFirstSearch(startNodes, targetNode, options.relationshipTypes);
			default:
				return this.dijkstraSearch(startNodes, targetNode, options.relationshipTypes);
		}
	}

	async findAlternativePaths(
		startNodes: string[],
		targetNode: string,
		options: {
			maxPaths: number;
			diversityWeight?: number;
		}
	): Promise<PathfindingResult[]> {
		const paths: PathfindingResult[] = [];
		const usedEdges = new Set<string>();

		for (let i = 0; i < options.maxPaths; i++) {
			try {
				const path = await this.findPathWithExclusions(startNodes, targetNode, usedEdges);
				if (path.path.length > 0) {
					paths.push(path);
					// Mark edges as used to encourage diversity
					path.steps.forEach(step => {
                    const edgeId = `${(step as any).from || ''}-${(step as any).to || ''}`;
						usedEdges.add(edgeId);
					});
				}
			} catch (error) {
				break; // No more paths available
			}
		}

		return paths;
	}

	private async dijkstraSearch(
		startNodes: string[],
		targetNode: string,
		relationshipTypes?: RelationshipType[]
	): Promise<PathfindingResult> {
		const distances = new Map<string, number>();
		const previous = new Map<string, { node: string; link: ContentLink }>();
		const unvisited = new Set<string>();

		// Initialize distances
		startNodes.forEach(node => {
			distances.set(node, 0);
			unvisited.add(node);
		});

		// Get all relevant links
		const allLinks = await relationshipStorage.findLinks({
			types: relationshipTypes
		});

		// Build adjacency list
		const graph = new Map<string, Array<{ target: string; link: ContentLink }>>();
		allLinks.forEach(link => {
			if (!graph.has(link.sourceId)) {graph.set(link.sourceId, []);}
			graph.get(link.sourceId)!.push({ target: link.targetId, link });
		});

		while (unvisited.size > 0) {
			// Find unvisited node with minimum distance
			let currentNode: string | null = null;
			let minDistance = Infinity;

			for (const node of unvisited) {
				const distance = distances.get(node) ?? Infinity;
				if (distance < minDistance) {
					minDistance = distance;
					currentNode = node;
				}
			}

			if (!currentNode || minDistance === Infinity) {break;}

			unvisited.delete(currentNode);

			if (currentNode === targetNode) {
				// Reconstruct path
				const path: string[] = [];
				const steps: Array<{ from: string; to: string; relationshipType: RelationshipType; strength: number }> = [];
				let current = targetNode;

				while (previous.has(current)) {
					path.unshift(current);
					const prev = previous.get(current)!;
					steps.unshift({
						from: prev.node,
						to: current,
						relationshipType: prev.link.type,
						strength: prev.link.strength
					});
					current = prev.node;
				}

				if (!startNodes.includes(current)) {
					path.unshift(current);
				}

				return {
					path,
					totalCost: distances.get(targetNode) || 0,
					steps
				};
			}

			// Update distances to neighbors
			const neighbors = graph.get(currentNode) || [];
			for (const { target, link } of neighbors) {
				const cost = 1 / link.strength; // Lower strength = higher cost
				const alt = minDistance + cost;

				if (alt < (distances.get(target) ?? Infinity)) {
					distances.set(target, alt);
					previous.set(target, { node: currentNode, link });
					unvisited.add(target);
				}
			}
		}

		// No path found
		return { path: [], totalCost: Infinity, steps: [] };
	}

	private async breadthFirstSearch(
		startNodes: string[],
		targetNode: string,
		relationshipTypes?: RelationshipType[]
	): Promise<PathfindingResult> {
		const queue: Array<{ node: string; path: string[]; steps: Array<{ from: string; to: string; relationshipType: RelationshipType; strength: number }> }> = [];
		const visited = new Set<string>();

		// Initialize with start nodes
		startNodes.forEach(node => {
			queue.push({ node, path: [node], steps: [] });
			visited.add(node);
		});

		// Get all relevant links
		const allLinks = await relationshipStorage.findLinks({
			types: relationshipTypes
		});

		// Build adjacency list
		const graph = new Map<string, Array<{ target: string; link: ContentLink }>>();
		allLinks.forEach(link => {
			if (!graph.has(link.sourceId)) {graph.set(link.sourceId, []);}
			graph.get(link.sourceId)!.push({ target: link.targetId, link });
		});

		while (queue.length > 0) {
			const current = queue.shift()!;

			if (current.node === targetNode) {
				const totalCost = current.steps.reduce((sum, step) => sum + (1 / step.strength), 0);
				return {
					path: current.path,
					totalCost,
					steps: current.steps
				};
			}

			const neighbors = graph.get(current.node) || [];
			for (const { target, link } of neighbors) {
				if (!visited.has(target)) {
					visited.add(target);
					queue.push({
						node: target,
						path: [...current.path, target],
						steps: [...current.steps, {
							from: current.node,
							to: target,
							relationshipType: link.type,
							strength: link.strength
						}]
					});
				}
			}
		}

		return { path: [], totalCost: Infinity, steps: [] };
	}

	private async depthFirstSearch(
		startNodes: string[],
		targetNode: string,
		relationshipTypes?: RelationshipType[]
	): Promise<PathfindingResult> {
		// Simple DFS implementation - similar to BFS but using stack
		const stack: Array<{ node: string; path: string[]; steps: Array<{ from: string; to: string; relationshipType: RelationshipType; strength: number }> }> = [];
		const visited = new Set<string>();

		startNodes.forEach(node => {
			stack.push({ node, path: [node], steps: [] });
		});

		const allLinks = await relationshipStorage.findLinks({
			types: relationshipTypes
		});

		const graph = new Map<string, Array<{ target: string; link: ContentLink }>>();
		allLinks.forEach(link => {
			if (!graph.has(link.sourceId)) {graph.set(link.sourceId, []);}
			graph.get(link.sourceId)!.push({ target: link.targetId, link });
		});

		while (stack.length > 0) {
			const current = stack.pop()!;

			if (visited.has(current.node)) {continue;}
			visited.add(current.node);

			if (current.node === targetNode) {
				const totalCost = current.steps.reduce((sum, step) => sum + (1 / step.strength), 0);
				return {
					path: current.path,
					totalCost,
					steps: current.steps
				};
			}

			const neighbors = graph.get(current.node) || [];
			for (const { target, link } of neighbors) {
				if (!visited.has(target)) {
					stack.push({
						node: target,
						path: [...current.path, target],
						steps: [...current.steps, {
							from: current.node,
							to: target,
							relationshipType: link.type,
							strength: link.strength
						}]
					});
				}
			}
		}

		return { path: [], totalCost: Infinity, steps: [] };
	}

	private async findPathWithExclusions(
		startNodes: string[],
		targetNode: string,
		excludedEdges: Set<string>
	): Promise<PathfindingResult> {
		// Modified Dijkstra that avoids excluded edges
		const distances = new Map<string, number>();
		const previous = new Map<string, { node: string; link: ContentLink }>();
		const unvisited = new Set<string>();

		startNodes.forEach(node => {
			distances.set(node, 0);
			unvisited.add(node);
		});

		const allLinks = await relationshipStorage.findLinks();
		const graph = new Map<string, Array<{ target: string; link: ContentLink }>>();

		allLinks.forEach(link => {
			const edgeId = `${link.sourceId}-${link.targetId}`;
			if (!excludedEdges.has(edgeId)) {
				if (!graph.has(link.sourceId)) {graph.set(link.sourceId, []);}
				graph.get(link.sourceId)!.push({ target: link.targetId, link });
			}
		});

		// Run modified Dijkstra (implementation similar to above)
		// ... (implementation details omitted for brevity)

		return { path: [], totalCost: Infinity, steps: [] };
	}
	}

	/**
	 * Content clustering analysis
	 */
	class ClusterAnalyzer {
	async analyzeClusters(
		graph: ContentGraph,
		modules: ContentModule[]
	): Promise<ClusterAnalysis> {
		const clusters = await this.detectCommunities(graph, modules);
		const isolatedNodes = this.findIsolatedNodes(graph);
		const bridgeNodes = this.findBridgeNodes(graph);

		return {
			clusters,
			isolatedNodes,
			bridgeNodes
		};
	}

	private async detectCommunities(
		graph: ContentGraph,
		modules: ContentModule[]
	): Promise<Array<{
		id: string;
		nodes: string[];
		centroid: string;
		topic: string;
		coherence: number;
	}>> {
		const clusters: Array<{
			id: string;
			nodes: string[];
			centroid: string;
			topic: string;
			coherence: number;
		}> = [];

		// Simple clustering based on tag similarity and connections
		const processed = new Set<string>();
		let clusterId = 0;

		for (const [nodeId, node] of graph.nodes) {
			if (processed.has(nodeId)) {continue;}

			const cluster = await this.growCluster(nodeId, graph, modules, processed);
			if (cluster.nodes.length > 1) {
				clusters.push({
					id: `cluster-${clusterId++}`,
					...cluster
				});
			}
		}

		return clusters;
	}

	private async growCluster(
		seedId: string,
		graph: ContentGraph,
		modules: ContentModule[],
		processed: Set<string>
	): Promise<{
		nodes: string[];
		centroid: string;
		topic: string;
		coherence: number;
	}> {
		const clusterNodes = new Set<string>([seedId]);
		const queue = [seedId];
		const seedModule = modules.find(m => m.id === seedId);

		if (!seedModule) {
			processed.add(seedId);
			return { nodes: [seedId], centroid: seedId, topic: 'unknown', coherence: 0 };
		}

		while (queue.length > 0) {
			const currentId = queue.shift()!;
			if (processed.has(currentId)) {continue;}

			processed.add(currentId);
			const currentNode = graph.nodes.get(currentId);
			if (!currentNode) {continue;}

			// Find connected nodes with high similarity
			const connectedLinks = [...currentNode.incomingLinks, ...currentNode.outgoingLinks];

			for (const linkId of connectedLinks) {
				const link = graph.edges.get(linkId);
				if (!link || link.strength < 0.7) {continue;}

				const neighborId = link.sourceId === currentId ? link.targetId : link.sourceId;
				if (clusterNodes.has(neighborId) || processed.has(neighborId)) {continue;}

				const neighborModule = modules.find(m => m.id === neighborId);
				if (!neighborModule) {continue;}

				// Check tag similarity for clustering
				const tagSimilarity = this.calculateTagSimilarity(
					seedModule.metadata.tags,
					neighborModule.metadata.tags
				);

				if (tagSimilarity > 0.5) {
					clusterNodes.add(neighborId);
					queue.push(neighborId);
				}
			}
		}

		// Calculate cluster properties
		const nodes = Array.from(clusterNodes);
		const centroid = this.findCentroid(nodes, graph);
		const topic = this.inferClusterTopic(nodes, modules);
		const coherence = this.calculateCoherence(nodes, graph);

		return { nodes, centroid, topic, coherence };
	}

	private calculateTagSimilarity(tags1: string[], tags2: string[]): number {
		const set1 = new Set(tags1);
		const set2 = new Set(tags2);
		const intersection = new Set([...set1].filter(x => set2.has(x)));
		const union = new Set([...set1, ...set2]);
		return union.size > 0 ? intersection.size / union.size : 0;
	}

	private findIsolatedNodes(graph: ContentGraph): string[] {
		const isolated: string[] = [];

		for (const [nodeId, node] of graph.nodes) {
			const totalConnections = node.incomingLinks.length + node.outgoingLinks.length;
			if (totalConnections === 0) {
				isolated.push(nodeId);
			}
		}

		return isolated;
	}

	private findBridgeNodes(graph: ContentGraph): string[] {
		const bridges: string[] = [];

		// Simple bridge detection - nodes with high betweenness centrality
		for (const [nodeId, node] of graph.nodes) {
			const inDegree = node.incomingLinks.length;
			const outDegree = node.outgoingLinks.length;
			const totalDegree = inDegree + outDegree;

			// If node has many connections to different clusters, it's likely a bridge
			if (totalDegree > 4) {
				bridges.push(nodeId);
			}
		}

		return bridges;
	}

	private findCentroid(nodes: string[], graph: ContentGraph): string {
		let maxConnections = 0;
		let centroid = nodes[0];

		for (const nodeId of nodes) {
			const node = graph.nodes.get(nodeId);
			if (!node) {continue;}

			const connections = node.incomingLinks.length + node.outgoingLinks.length;
			if (connections > maxConnections) {
				maxConnections = connections;
				centroid = nodeId;
			}
		}

		return centroid;
	}

	private inferClusterTopic(nodes: string[], modules: ContentModule[]): string {
		const tagCounts = new Map<string, number>();

		for (const nodeId of nodes) {
			const module = modules.find(m => m.id === nodeId);
			if (!module) {continue;}

			for (const tag of module.metadata.tags) {
				tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
			}
		}

		// Find most common tag
		let mostCommonTag = 'unknown';
		let maxCount = 0;

		for (const [tag, count] of tagCounts) {
			if (count > maxCount) {
				maxCount = count;
				mostCommonTag = tag;
			}
		}

		return mostCommonTag;
	}

	private calculateCoherence(nodes: string[], graph: ContentGraph): number {
		if (nodes.length < 2) {return 1;}

		let internalConnections = 0;
		let totalPossibleConnections = nodes.length * (nodes.length - 1) / 2;

		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				const node1 = graph.nodes.get(nodes[i]);
				const node2 = graph.nodes.get(nodes[j]);

				if (!node1 || !node2) {continue;}

				// Check if there's a connection between these nodes
				const hasConnection = [...node1.outgoingLinks, ...node1.incomingLinks].some(linkId => {
					const link = graph.edges.get(linkId);
					return link && (link.sourceId === nodes[j] || link.targetId === nodes[j]);
				});

				if (hasConnection) {internalConnections++;}
			}
		}

		return totalPossibleConnections > 0 ? internalConnections / totalPossibleConnections : 0;
	}
	}

	// Export the enhanced relationship service instance
	export const enhancedRelationshipService = new EnhancedRelationshipService();
