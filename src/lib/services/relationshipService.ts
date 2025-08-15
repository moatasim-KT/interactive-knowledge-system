/**
 * Enhanced relationship service with graph algorithms and visual layout
 */
import type { ContentLink, ContentGraph, ContentGraphNode, DependencyChain, RelationshipType, KnowledgeMap, KnowledgeMapNode, KnowledgeMapConnection, ContentRecommendation, SimilarityScore, ContentModule, GraphLayout, VisualNode, RelationshipAnalysis } from '../types/unified.js';
import { relationshipStorage } from '../storage/relationshipStorage.js';
import { similarityEngine } from '../utils/similarityEngine.js';

export interface GraphLayout {
	type: 'hierarchical' | 'force-directed' | 'circular' | 'grid' | 'tree';
	width: number;
	height: number;
	nodeSpacing: number;
	levelSpacing: number;
}

export interface VisualNode extends ContentGraphNode {
	position: { x: number; y: number };
	velocity?: { x: number; y: number };
	force?: { x: number; y: number };
	level?: number; // For hierarchical layout
	cluster?: string; // For clustering
	fixed?: boolean; // For user-positioned nodes
}

export interface RelationshipAnalysis {
	strongestConnections: Array<{ link: ContentLink; strength: number }>;
	clusters: Array<{ id: string; nodes: string[]; centroid: ContentModule }>;
	criticalPath: string[]; // Most important learning path
	isolatedNodes: string[]; // Content with no relationships
	circularDependencies: string[][];
	recommendedLinks: ContentLink[];
}

/**
 * Enhanced relationship service
 */
export class RelationshipService {
	private layoutCache = new Map<string, VisualNode[]>();
	private analysisCache = new Map<string, RelationshipAnalysis>();

	/**
	 * Build enhanced content graph with visual layout
	 */
	async buildVisualGraph(
		modules: ContentModule[],
		layout: GraphLayout,
		completedContent: Set<string> = new Set(),
		filters?: {
			showCompleted?: boolean;
			showPrerequisites?: boolean;
			difficultyRange?: [number, number];
			tags?: string[];
		}
	): Promise<{ nodes: VisualNode[]; edges: ContentLink[] }> {
		// Filter modules based on criteria
		const filteredModules = this.filterModules(modules, filters);

		// Build base graph
		const graph = await relationshipStorage.buildContentGraph(filteredModules);

		// Create visual nodes with positions
		const visualNodes = await this.createVisualNodes(filteredModules, graph, completedContent);

		// Apply layout algorithm
		const positionedNodes = await this.applyLayout(visualNodes, Array.from(graph.edges.values()), layout);

		// Get filtered edges
		const edges = Array.from(graph.edges.values()).filter(edge =>
			positionedNodes.some(n => n.id === edge.sourceId) &&
			positionedNodes.some(n => n.id === edge.targetId)
		);

		return { nodes: positionedNodes, edges };
	}

	/**
	 * Generate knowledge map with advanced features
	 */
	async generateKnowledgeMap(
		modules: ContentModule[],
		completedContent: Set<string>,
		currentContent?: string,
		options: {
			layout?: GraphLayout;
			showClusters?: boolean;
			showProgress?: boolean;
			highlightPath?: boolean;
		} = {}
	): Promise<KnowledgeMap> {
		const layout = options.layout || {
			type: 'force-directed',
			width: 1000,
			height: 800,
			nodeSpacing: 80,
			levelSpacing: 120
		};

		const { nodes: visualNodes, edges } = await this.buildVisualGraph(modules, layout, completedContent);

		// Convert to knowledge map format
		const mapNodes: KnowledgeMapNode[] = visualNodes.map(node => ({
			id: node.id,
			contentId: node.id,
			title: node.title,
			type: this.getNodeType(node, modules),
			status: this.getNodeStatus(node.id, completedContent, currentContent),
			position: node.position,
			size: this.calculateNodeSize(node, modules),
			color: this.getNodeColor(node.id, completedContent, currentContent, options.showClusters ? node.cluster : undefined)
		}));

		const mapConnections: KnowledgeMapConnection[] = edges.map(edge => ({
			id: edge.id,
			sourceId: edge.sourceId,
			targetId: edge.targetId,
			type: edge.type,
			strength: edge.strength,
			style: this.getConnectionStyle(edge.type),
			color: this.getConnectionColor(edge.type, edge.strength)
		}));

		// Highlight learning path if requested
		if (options.highlightPath && currentContent) {
			const path = await this.findOptimalPath(currentContent, modules, completedContent);
			this.highlightPath(mapNodes, mapConnections, path);
		}

		return {
			id: `map-${Date.now()}`,
			title: 'Knowledge Map',
			description: 'Interactive visualization of content relationships',
			nodes: mapNodes,
			connections: mapConnections,
			layout: layout.type,
			filters: {
				showCompleted: true,
				showPrerequisites: true,
				difficultyRange: [1, 5],
				tags: []
			}
		};
	}

	/**
	 * Analyze relationships and find insights
	 */
	async analyzeRelationships(modules: ContentModule[]): Promise<RelationshipAnalysis> {
		const cacheKey = modules.map(m => m.id).sort().join('-');

		if (this.analysisCache.has(cacheKey)) {
			return this.analysisCache.get(cacheKey)!;
		}

		const graph = await relationshipStorage.buildContentGraph(modules);
		const links = Array.from(graph.edges.values());

		// Find strongest connections
		const strongestConnections = links
			.map(link => ({ link, strength: link.strength }))
			.sort((a, b) => b.strength - a.strength)
			.slice(0, 10);

		// Detect clusters
		const clusters = await this.detectClusters(modules, links);

		// Find critical learning path
		const criticalPath = await this.findCriticalPath(modules, links);

		// Find isolated nodes
		const connectedNodes = new Set([...links.map(l => l.sourceId), ...links.map(l => l.targetId)]);
		const isolatedNodes = modules
			.filter(m => !connectedNodes.has(m.id))
			.map(m => m.id);

		// Detect circular dependencies
		const circularDependencies = await relationshipStorage.findCircularDependencies();

		// Generate recommended links
		const recommendedLinks = await this.generateRecommendedLinks(modules, links);

		const analysis: RelationshipAnalysis = {
			strongestConnections,
			clusters,
			criticalPath,
			isolatedNodes,
			circularDependencies,
			recommendedLinks
		};

		this.analysisCache.set(cacheKey, analysis);
		return analysis;
	}

	/**
	 * Find optimal learning path from current position
	 */
	async findOptimalPath(
		currentContentId: string,
		modules: ContentModule[],
		completedContent: Set<string>
	): Promise<string[]> {
		const graph = await relationshipStorage.buildContentGraph(modules);
		const visited = new Set<string>();
		const path: string[] = [];

		// Use modified BFS to find path that maximizes learning value
		const queue = [{ nodeId: currentContentId, pathSoFar: [currentContentId], value: 0 }];
		const bestPaths = new Map<string, { path: string[]; value: number }>();

		while (queue.length > 0) {
			const { nodeId, pathSoFar, value } = queue.shift()!;

			if (visited.has(nodeId)) {continue;}
			visited.add(nodeId);

			// Update best path to this node
			if (!bestPaths.has(nodeId) || bestPaths.get(nodeId)!.value < value) {
				bestPaths.set(nodeId, { path: [...pathSoFar], value });
			}

			// Find next nodes
			const node = graph.nodes.get(nodeId);
			if (!node) {continue;}

			for (const linkId of node.outgoingLinks) {
				const link = graph.edges.get(linkId);
				if (!link || link.type !== 'sequence' && link.type !== 'prerequisite') {continue;}

				const targetId = link.targetId;
				if (completedContent.has(targetId) || visited.has(targetId)) {continue;}

				// Check if prerequisites are met
				const dependencyChain = await relationshipStorage.analyzeDependencyChain(targetId, completedContent);
				if (!dependencyChain.canAccess) {continue;}

				// Calculate learning value (difficulty, importance, etc.)
				const targetModule = modules.find(m => m.id === targetId);
				const learningValue = targetModule ? this.calculateLearningValue(targetModule) : 0;

				queue.push({
					nodeId: targetId,
					pathSoFar: [...pathSoFar, targetId],
					value: value + learningValue * link.strength
				});
			}
		}

		// Return the path to the highest value reachable node
		const sortedPaths = Array.from(bestPaths.values()).sort((a, b) => b.value - a.value);
		return sortedPaths.length > 0 ? sortedPaths[0].path : [currentContentId];
	}

	/**
	 * Enforce prerequisite dependencies
	 */
	async enforcePrerequisites(
		contentId: string,
		completedContent: Set<string>
	): Promise<{ canAccess: boolean; missingPrerequisites: string[]; suggestions: ContentRecommendation[] }> {
		const dependencyChain = await relationshipStorage.analyzeDependencyChain(contentId, completedContent);

		if (dependencyChain.canAccess) {
			return { canAccess: true, missingPrerequisites: [], suggestions: [] };
		}

		const allModules = []; // This would come from content storage in real implementation
		const missingPrereqs = dependencyChain.prerequisites.filter(id => !completedContent.has(id));

		// Generate suggestions for next steps
		const suggestions = await similarityEngine.generateRecommendations(
			'current-user', // TODO: Get from context
			completedContent,
			missingPrereqs[0], // Focus on first missing prerequisite
			allModules,
			5
		);

		return {
			canAccess: false,
			missingPrerequisites: missingPrereqs,
			suggestions
		};
	}

	/**
	 * Create bidirectional links with automatic reverse relationships
	 */
	async createBidirectionalLink(
		sourceId: string,
		targetId: string,
		type: RelationshipType,
		strength: number = 1.0,
		description?: string
	): Promise<{ forward: ContentLink; reverse?: ContentLink }> {
		// Create primary link
		const forward = await relationshipStorage.createLink(sourceId, targetId, type, strength, description, false);

		let reverse: ContentLink | undefined;

		// Create reverse link for bidirectional relationships
		if (this.isBidirectionalType(type)) {
			const reverseType = this.getReverseType(type);
			reverse = await relationshipStorage.createLink(targetId, sourceId, reverseType, strength, description, false);
		}

		return { forward, reverse };
	}

	/**
	 * Generate intelligent content suggestions
	 */
	async generateSmartSuggestions(
		currentContentId: string,
		modules: ContentModule[],
		completedContent: Set<string>,
		userInterests: string[] = [],
		learningGoals: string[] = []
	): Promise<{
		nextSteps: ContentRecommendation[];
		relatedContent: ContentRecommendation[];
		practiceOpportunities: ContentRecommendation[];
		reviewSuggestions: ContentRecommendation[];
	}> {
		const currentModule = modules.find(m => m.id === currentContentId);
		if (!currentModule) {
			throw new Error('Current content not found');
		}

		// Generate different types of recommendations
		const [nextSteps, relatedContent, practiceOpportunities, reviewSuggestions] = await Promise.all([
			this.getNextStepSuggestions(currentModule, modules, completedContent),
			this.getRelatedContentSuggestions(currentModule, modules, completedContent, userInterests),
			this.getPracticeSuggestions(completedContent, modules),
			this.getReviewSuggestions(completedContent, modules)
		]);

		return { nextSteps, relatedContent, practiceOpportunities, reviewSuggestions };
	}

	// Private helper methods

	private filterModules(modules: ContentModule[], filters?: any): ContentModule[] {
		if (!filters) {return modules;}

		return modules.filter(module => {
			// Filter by difficulty range
			if (filters.difficultyRange) {
				const [min, max] = filters.difficultyRange;
				if (module.metadata.difficulty < min || module.metadata.difficulty > max) {
					return false;
				}
			}

			// Filter by tags
			if (filters.tags && filters.tags.length > 0) {
				const hasTag = filters.tags.some((tag: string) => module.metadata.tags.includes(tag));
				if (!hasTag) {return false;}
			}

			return true;
		});
	}

	private async createVisualNodes(
		modules: ContentModule[],
		graph: ContentGraph,
		completedContent: Set<string>
	): Promise<VisualNode[]> {
		return modules.map(module => {
			const graphNode = graph.nodes.get(module.id);
			return {
				id: module.id,
				title: module.title,
				type: 'module',
				tags: module.metadata.tags,
				difficulty: module.metadata.difficulty,
				incomingLinks: graphNode?.incomingLinks || [],
				outgoingLinks: graphNode?.outgoingLinks || [],
				position: { x: 0, y: 0 }, // Will be set by layout algorithm
				velocity: { x: 0, y: 0 },
				force: { x: 0, y: 0 }
			};
		});
	}

	private async applyLayout(
		nodes: VisualNode[],
		edges: ContentLink[],
		layout: GraphLayout
	): Promise<VisualNode[]> {
		const cacheKey = `${layout.type}-${nodes.length}-${edges.length}`;

		if (this.layoutCache.has(cacheKey)) {
			return this.layoutCache.get(cacheKey)!;
		}

		let positionedNodes: VisualNode[];

		switch (layout.type) {
			case 'hierarchical':
				positionedNodes = this.applyHierarchicalLayout(nodes, edges, layout);
				break;
			case 'force-directed':
				positionedNodes = this.applyForceDirectedLayout(nodes, edges, layout);
				break;
			case 'circular':
				positionedNodes = this.applyCircularLayout(nodes, layout);
				break;
			case 'grid':
				positionedNodes = this.applyGridLayout(nodes, layout);
				break;
			case 'tree':
				positionedNodes = this.applyTreeLayout(nodes, edges, layout);
				break;
			default:
				positionedNodes = this.applyForceDirectedLayout(nodes, edges, layout);
		}

		this.layoutCache.set(cacheKey, positionedNodes);
		return positionedNodes;
	}

	private applyForceDirectedLayout(nodes: VisualNode[], edges: ContentLink[], layout: GraphLayout): VisualNode[] {
		// Initialize random positions
		nodes.forEach(node => {
			node.position = {
				x: Math.random() * layout.width,
				y: Math.random() * layout.height
			};
			node.velocity = { x: 0, y: 0 };
			node.force = { x: 0, y: 0 };
		});

		const iterations = 300;
		const repulsionStrength = 2000;
		const attractionStrength = 0.01;
		const damping = 0.9;
		const centeringForce = 0.01;

		for (let i = 0; i < iterations; i++) {
			// Reset forces
			nodes.forEach(node => {
				node.force = { x: 0, y: 0 };
			});

			// Repulsion forces
			for (let j = 0; j < nodes.length; j++) {
				for (let k = j + 1; k < nodes.length; k++) {
					const node1 = nodes[j];
					const node2 = nodes[k];

					const dx = node1.position.x - node2.position.x;
					const dy = node1.position.y - node2.position.y;
					const distance = Math.sqrt(dx * dx + dy * dy);

					if (distance > 0) {
						const force = repulsionStrength / (distance * distance);
						const fx = (dx / distance) * force;
						const fy = (dy / distance) * force;

						node1.force!.x += fx;
						node1.force!.y += fy;
						node2.force!.x -= fx;
						node2.force!.y -= fy;
					}
				}
			}

			// Attraction forces from edges
			edges.forEach(edge => {
				const source = nodes.find(n => n.id === edge.sourceId);
				const target = nodes.find(n => n.id === edge.targetId);

				if (source && target) {
					const dx = target.position.x - source.position.x;
					const dy = target.position.y - source.position.y;
					const distance = Math.sqrt(dx * dx + dy * dy);

					if (distance > 0) {
						const force = attractionStrength * edge.strength * distance;
						const fx = (dx / distance) * force;
						const fy = (dy / distance) * force;

						source.force!.x += fx;
						source.force!.y += fy;
						target.force!.x -= fx;
						target.force!.y -= fy;
					}
				}
			});

			// Centering force
			const centerX = layout.width / 2;
			const centerY = layout.height / 2;
			nodes.forEach(node => {
				const dx = centerX - node.position.x;
				const dy = centerY - node.position.y;
				node.force!.x += dx * centeringForce;
				node.force!.y += dy * centeringForce;
			});

			// Update positions
			nodes.forEach(node => {
				node.velocity!.x = (node.velocity!.x + node.force!.x) * damping;
				node.velocity!.y = (node.velocity!.y + node.force!.y) * damping;

				node.position.x += node.velocity!.x;
				node.position.y += node.velocity!.y;

				// Keep within bounds
				node.position.x = Math.max(50, Math.min(layout.width - 50, node.position.x));
				node.position.y = Math.max(50, Math.min(layout.height - 50, node.position.y));
			});
		}

		return nodes;
	}

	private applyHierarchicalLayout(nodes: VisualNode[], edges: ContentLink[], layout: GraphLayout): VisualNode[] {
		// Assign levels based on dependency depth
		const levels = new Map<string, number>();
		const visited = new Set<string>();

		// Find root nodes (no incoming prerequisite edges)
		const rootNodes = nodes.filter(node => {
			return !edges.some(edge => edge.targetId === node.id && edge.type === 'prerequisite');
		});

		// BFS to assign levels
		const queue = rootNodes.map(node => ({ node, level: 0 }));
		rootNodes.forEach(node => levels.set(node.id, 0));

		while (queue.length > 0) {
			const { node, level } = queue.shift()!;
			if (visited.has(node.id)) {continue;}
			visited.add(node.id);

			node.level = level;

			// Find children
			const childEdges = edges.filter(edge => edge.sourceId === node.id && edge.type === 'prerequisite');
			childEdges.forEach(edge => {
				const childNode = nodes.find(n => n.id === edge.targetId);
				if (childNode && !visited.has(childNode.id)) {
					const childLevel = level + 1;
					if (!levels.has(childNode.id) || levels.get(childNode.id)! < childLevel) {
						levels.set(childNode.id, childLevel);
						queue.push({ node: childNode, level: childLevel });
					}
				}
			});
		}

		// Position nodes by level
		const nodesByLevel = new Map<number, VisualNode[]>();
		nodes.forEach(node => {
			const level = levels.get(node.id) || 0;
			node.level = level;
			if (!nodesByLevel.has(level)) {
				nodesByLevel.set(level, []);
			}
			nodesByLevel.get(level)!.push(node);
		});

		// Arrange nodes within levels
		Array.from(nodesByLevel.entries()).forEach(([level, levelNodes]) => {
			const y = 50 + level * layout.levelSpacing;
			const totalWidth = (levelNodes.length - 1) * layout.nodeSpacing;
			const startX = (layout.width - totalWidth) / 2;

			levelNodes.forEach((node, index) => {
				node.position = {
					x: startX + index * layout.nodeSpacing,
					y
				};
			});
		});

		return nodes;
	}

	private applyCircularLayout(nodes: VisualNode[], layout: GraphLayout): VisualNode[] {
		const centerX = layout.width / 2;
		const centerY = layout.height / 2;
		const radius = Math.min(layout.width, layout.height) * 0.4;

		nodes.forEach((node, index) => {
			const angle = (index / nodes.length) * 2 * Math.PI;
			node.position = {
				x: centerX + Math.cos(angle) * radius,
				y: centerY + Math.sin(angle) * radius
			};
		});

		return nodes;
	}

	private applyGridLayout(nodes: VisualNode[], layout: GraphLayout): VisualNode[] {
		const cols = Math.ceil(Math.sqrt(nodes.length));
		const rows = Math.ceil(nodes.length / cols);
		const cellWidth = layout.width / cols;
		const cellHeight = layout.height / rows;

		nodes.forEach((node, index) => {
			const col = index % cols;
			const row = Math.floor(index / cols);
			node.position = {
				x: col * cellWidth + cellWidth / 2,
				y: row * cellHeight + cellHeight / 2
			};
		});

		return nodes;
	}

	private applyTreeLayout(nodes: VisualNode[], edges: ContentLink[], layout: GraphLayout): VisualNode[] {
		// Similar to hierarchical but with tree-specific positioning
		return this.applyHierarchicalLayout(nodes, edges, layout);
	}

	private async detectClusters(modules: ContentModule[], links: ContentLink[]): Promise<Array<{ id: string; nodes: string[]; centroid: ContentModule }>> {
		// Simple clustering based on tag similarity and connections
		const clusters: Array<{ id: string; nodes: string[]; centroid: ContentModule }> = [];
		const clustered = new Set<string>();

		// Group by dominant tags
		const tagGroups = new Map<string, ContentModule[]>();

		modules.forEach(module => {
			if (clustered.has(module.id)) {return;}

			const dominantTag = module.metadata.tags[0]; // Simplified
			if (!tagGroups.has(dominantTag)) {
				tagGroups.set(dominantTag, []);
			}
			tagGroups.get(dominantTag)!.push(module);
		});

		// Create clusters from tag groups
		Array.from(tagGroups.entries()).forEach(([tag, groupModules], index) => {
			if (groupModules.length >= 2) {
				// Find centroid (most connected node in group)
				const centroid = groupModules.reduce((best, current) => {
					const currentConnections = links.filter(l => l.sourceId === current.id || l.targetId === current.id);
					const bestConnections = links.filter(l => l.sourceId === best.id || l.targetId === best.id);
					return currentConnections.length > bestConnections.length ? current : best;
				});

				clusters.push({
					id: `cluster-${index}`,
					nodes: groupModules.map(m => m.id),
					centroid
				});

				groupModules.forEach(m => clustered.add(m.id));
			}
		});

		return clusters;
	}

	private async findCriticalPath(modules: ContentModule[], links: ContentLink[]): Promise<string[]> {
		// Find the longest path through prerequisite chains
		const graph = new Map<string, string[]>();

		// Build adjacency list for prerequisite relationships
		links.filter(l => l.type === 'prerequisite').forEach(link => {
			if (!graph.has(link.sourceId)) {
				graph.set(link.sourceId, []);
			}
			graph.get(link.sourceId)!.push(link.targetId);
		});

		// Find longest path using DFS
		const visited = new Set<string>();
		let longestPath: string[] = [];

		const dfs = (nodeId: string, currentPath: string[]): string[] => {
			if (visited.has(nodeId)) {return currentPath;}

			visited.add(nodeId);
			const newPath = [...currentPath, nodeId];
			let bestPath = newPath;

			const neighbors = graph.get(nodeId) || [];
			neighbors.forEach(neighbor => {
				const path = dfs(neighbor, newPath);
				if (path.length > bestPath.length) {
					bestPath = path;
				}
			});

			visited.delete(nodeId);
			return bestPath;
		};

		// Start DFS from all possible root nodes
		modules.forEach(module => {
			const path = dfs(module.id, []);
			if (path.length > longestPath.length) {
				longestPath = path;
			}
		});

		return longestPath;
	}

	private async generateRecommendedLinks(modules: ContentModule[], existingLinks: ContentLink[]): Promise<ContentLink[]> {
		const recommendations: ContentLink[] = [];
		const existingPairs = new Set(existingLinks.map(l => `${l.sourceId}-${l.targetId}`));

		// Find similar modules that aren't linked
		for (let i = 0; i < modules.length; i++) {
			for (let j = i + 1; j < modules.length; j++) {
				const module1 = modules[i];
				const module2 = modules[j];

				const pairKey1 = `${module1.id}-${module2.id}`;
				const pairKey2 = `${module2.id}-${module1.id}`;

				if (!existingPairs.has(pairKey1) && !existingPairs.has(pairKey2)) {
					const similarity = await similarityEngine.calculateSimilarity(module1, module2);

					if (similarity.score > 0.6) {
						recommendations.push({
							id: `rec-${module1.id}-${module2.id}`,
							sourceId: module1.id,
							targetId: module2.id,
							type: 'related',
							strength: similarity.score,
							metadata: {
								created: new Date(),
								createdBy: 'system',
								description: `Auto-suggested based on ${Math.round(similarity.score * 100)}% similarity`,
								automatic: true
							}
						});
					}
				}
			}
		}

		return recommendations.slice(0, 20); // Limit recommendations
	}

	private getNodeType(node: VisualNode, modules: ContentModule[]): 'concept' | 'skill' | 'topic' | 'milestone' {
		const module = modules.find(m => m.id === node.id);
		if (!module) {return 'concept';}

		// Simple heuristic based on tags and content
		if (module.metadata.tags.includes('skill') || module.metadata.tags.includes('practice')) {
			return 'skill';
		}
		if (module.metadata.tags.includes('milestone') || module.metadata.tags.includes('assessment')) {
			return 'milestone';
		}
		if (module.metadata.tags.includes('topic') || module.metadata.tags.includes('overview')) {
			return 'topic';
		}
		return 'concept';
	}

	private getNodeStatus(
		nodeId: string,
		completedContent: Set<string>,
		currentContent?: string
	): 'locked' | 'available' | 'in-progress' | 'completed' {
		if (completedContent.has(nodeId)) {return 'completed';}
		if (nodeId === currentContent) {return 'in-progress';}
		// TODO: Check prerequisites for 'available' vs 'locked'
		return 'available';
	}

	private calculateNodeSize(node: VisualNode, modules: ContentModule[]): number {
		const module = modules.find(m => m.id === node.id);
		if (!module) {return 20;}

		// Base size + complexity factor
		const baseSize = 20;
		const complexityFactor = module.blocks.length * 2;
		const difficultyFactor = module.metadata.difficulty * 3;

		return Math.min(50, baseSize + complexityFactor + difficultyFactor);
	}

	private getNodeColor(
		nodeId: string,
		completedContent: Set<string>,
		currentContent?: string,
		cluster?: string
	): string {
		if (completedContent.has(nodeId)) {return '#22c55e';} // Green for completed
		if (nodeId === currentContent) {return '#3b82f6';} // Blue for current
		if (cluster) {
			// Generate color based on cluster ID
			const hash = cluster.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
			const hue = hash % 360;
			return `hsl(${hue}, 60%, 60%)`;
		}
		return '#f59e0b'; // Yellow for available
	}

	private getConnectionStyle(type: RelationshipType): 'solid' | 'dashed' | 'dotted' {
		switch (type) {
			case 'prerequisite':
			case 'dependent':
			case 'sequence':
				return 'solid';
			case 'related':
			case 'similar':
				return 'dashed';
			case 'reference':
			case 'example':
			case 'practice':
				return 'dotted';
			default:
				return 'solid';
		}
	}

	private getConnectionColor(type: RelationshipType, strength: number): string {
		const alpha = Math.max(0.3, strength);

		switch (type) {
			case 'prerequisite':
				return `rgba(239, 68, 68, ${alpha})`; // Red
			case 'dependent':
				return `rgba(245, 101, 101, ${alpha})`; // Light red
			case 'sequence':
				return `rgba(59, 130, 246, ${alpha})`; // Blue
			case 'related':
				return `rgba(107, 114, 128, ${alpha})`; // Gray
			case 'similar':
				return `rgba(168, 85, 247, ${alpha})`; // Purple
			case 'reference':
				return `rgba(34, 197, 94, ${alpha})`; // Green
			case 'example':
				return `rgba(251, 191, 36, ${alpha})`; // Yellow
			case 'practice':
				return `rgba(249, 115, 22, ${alpha})`; // Orange
			default:
				return `rgba(107, 114, 128, ${alpha})`;
		}
	}

	private highlightPath(nodes: KnowledgeMapNode[], connections: KnowledgeMapConnection[], path: string[]): void {
		// Dim all nodes first
		nodes.forEach(node => {
			node.color = node.color.replace(/,\s*[\d.]+\)$/, ', 0.3)');
		});

		// Highlight path nodes
		const pathSet = new Set(path);
		nodes.forEach(node => {
			if (pathSet.has(node.id)) {
				node.color = node.color.replace(/,\s*[\d.]+\)$/, ', 1.0)');
			}
		});

		// Highlight path connections
		connections.forEach(connection => {
			const isPathConnection = pathSet.has(connection.sourceId) && pathSet.has(connection.targetId);
			if (isPathConnection) {
				connection.color = '#ff6b6b';
			}
		});
	}

	private calculateLearningValue(module: ContentModule): number {
		// Calculate learning value based on various factors
		const difficultyWeight = module.metadata.difficulty / 5; // Normalize to 0-1
		const contentWeight = Math.min(module.blocks.length / 10, 1); // More content = higher value
		const tagsWeight = Math.min(module.metadata.tags.length / 5, 1); // More specific = higher value

		return (difficultyWeight + contentWeight + tagsWeight) / 3;
	}

	private isBidirectionalType(type: RelationshipType): boolean {
		return ['related', 'similar'].includes(type);
	}

	private getReverseType(type: RelationshipType): RelationshipType {
		switch (type) {
			case 'prerequisite':
				return 'dependent';
			case 'dependent':
				return 'prerequisite';
			default:
				return type; // For bidirectional types like 'related', 'similar'
		}
	}

	private async getNextStepSuggestions(
		currentModule: ContentModule,
		modules: ContentModule[],
		completedContent: Set<string>
	): Promise<ContentRecommendation[]> {
		const recommendations: ContentRecommendation[] = [];

		// Find modules that have current module as prerequisite
		const outgoingLinks = await relationshipStorage.getOutgoingLinks(currentModule.id);
		const nextStepLinks = outgoingLinks.filter(link =>
			['sequence', 'prerequisite', 'dependent'].includes(link.type)
		);

		for (const link of nextStepLinks) {
			const targetModule = modules.find(m => m.id === link.targetId);
			if (!targetModule || completedContent.has(targetModule.id)) {continue;}

			// Check if prerequisites are met
			const dependencyChain = await relationshipStorage.analyzeDependencyChain(
				targetModule.id,
				completedContent
			);

			if (dependencyChain.canAccess) {
				recommendations.push({
					contentId: targetModule.id,
					score: 0.9 * link.strength,
					type: 'next-in-sequence',
					reasons: [{
						type: 'prerequisite-completed',
						weight: 1.0,
						description: `Logical next step after completing ${currentModule.title}`
					}]
				});
			}
		}

		return recommendations.sort((a, b) => b.score - a.score);
	}

	private async getRelatedContentSuggestions(
		currentModule: ContentModule,
		modules: ContentModule[],
		completedContent: Set<string>,
		userInterests: string[] = []
	): Promise<ContentRecommendation[]> {
		const recommendations: ContentRecommendation[] = [];

		// Find similar content
		const similarContent = await similarityEngine.findSimilarContent(currentModule, modules, 10, 0.3);

		for (const similar of similarContent) {
			if (completedContent.has(similar.contentId)) {continue;}

			const targetModule = modules.find(m => m.id === similar.contentId);
			if (!targetModule) {continue;}

			// Boost score if matches user interests
			let interestBoost = 1.0;
			if (userInterests.length > 0) {
				const matchingInterests = targetModule.metadata.tags.filter(tag =>
					userInterests.some(interest => interest.toLowerCase() === tag.toLowerCase())
				);
				interestBoost = 1.0 + (matchingInterests.length * 0.2);
			}

			recommendations.push({
				contentId: similar.contentId,
				score: similar.score * 0.7 * interestBoost,
				type: 'related-topic',
				reasons: [{
					type: 'similar-content',
					weight: similar.score,
					description: `${Math.round(similar.score * 100)}% similar to ${currentModule.title}`
				}]
			});
		}

		return recommendations.sort((a, b) => b.score - a.score).slice(0, 5);
	}

	private async getPracticeSuggestions(
		completedContent: Set<string>,
		modules: ContentModule[]
	): Promise<ContentRecommendation[]> {
		const recommendations: ContentRecommendation[] = [];

		// Find practice modules for completed content
		for (const completedId of completedContent) {
			const practiceLinks = await relationshipStorage.getOutgoingLinks(completedId);
			const practiceModules = practiceLinks
				.filter(link => link.type === 'practice')
				.map(link => modules.find(m => m.id === link.targetId))
				.filter(module => module && !completedContent.has(module.id));

			for (const module of practiceModules) {
				if (!module) {continue;}

				recommendations.push({
					contentId: module.id,
					score: 0.6,
					type: 'practice',
					reasons: [{
						type: 'difficulty-match',
						weight: 0.8,
						description: 'Practice exercises for mastered concepts'
					}]
				});
			}
		}

		return recommendations.sort((a, b) => b.score - a.score).slice(0, 3);
	}

	private async getReviewSuggestions(
		completedContent: Set<string>,
		modules: ContentModule[]
	): Promise<ContentRecommendation[]> {
		const recommendations: ContentRecommendation[] = [];

		// Simple spaced repetition: suggest review of completed content
		const completedModules = modules.filter(m => completedContent.has(m.id));

		// Sort by difficulty (review harder content more often)
		const reviewCandidates = completedModules
			.sort((a, b) => b.metadata.difficulty - a.metadata.difficulty)
			.slice(0, 3);

		for (const module of reviewCandidates) {
			recommendations.push({
				contentId: module.id,
				score: 0.4 + (module.metadata.difficulty * 0.1),
				type: 'review',
				reasons: [{
					type: 'topic-continuation',
					weight: 0.6,
					description: `Review ${module.title} to reinforce learning`
				}]
			});
		}

		return recommendations;
	}

	/**
	 * Clear caches (useful for testing or when content changes significantly)
	 */
	clearCaches(): void {
		this.layoutCache.clear();
		this.analysisCache.clear();
	}
}

// Export singleton instance
export const relationshipService = new RelationshipService();
