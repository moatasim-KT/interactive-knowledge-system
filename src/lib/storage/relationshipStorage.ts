/**
 * Storage operations for content relationships and links
 */
import { storage } from './indexeddb.js';
import type {
	ContentLink,
	ContentGraph,
	ContentGraphNode,
	DependencyChain,
	RelationshipType
} from '../types/relationships.js';
import type { ContentModule } from '../types/content.js';

/**
 * Relationship storage operations
 */
export class RelationshipStorage {
	/**
	 * Create a bidirectional link between two content pieces
	 */
	async createLink(
		sourceId: string,
		targetId: string,
		type: RelationshipType,
		strength: number = 1.0,
		description?: string,
		automatic: boolean = false
	): Promise<ContentLink> {
		const link: ContentLink = {
			id: `${sourceId}-${targetId}-${type}`,
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

		await storage.add('links', link, `Created ${type} link`);

		// Create reverse link for bidirectional relationship
		if (type === 'related' || type === 'similar') {
			const reverse_link = {
				...link,
				id: `${targetId}-${sourceId}-${type}`,
				sourceId: targetId,
				targetId: sourceId
			};
			await storage.add('links', reverse_link, `Created reverse ${type} link`);
		}

		return link;
	}

	/**
	 * Get all links for a specific content piece
	 */
	async getLinksForContent(contentId: string): Promise<ContentLink[]> {
		const all_links = await storage.getAll('links');
		return all_links.filter((link) => link.sourceId === contentId || link.targetId === contentId);
	}

	/**
	 * Get links of a specific type
	 */
	async getLinksByType(type: RelationshipType): Promise<ContentLink[]> {
		return await storage.searchByIndex('links', 'type', type);
	}

	/**
	 * Get outgoing links from a content piece
	 */
	async getOutgoingLinks(contentId: string): Promise<ContentLink[]> {
		return await storage.searchByIndex('links', 'sourceId', contentId);
	}

	/**
	 * Get incoming links to a content piece
	 */
	async getIncomingLinks(contentId: string): Promise<ContentLink[]> {
		return await storage.searchByIndex('links', 'targetId', contentId);
	}

	/**
	 * Delete a link
	 */
	async deleteLink(linkId: string): Promise<void> {
		await storage.delete('links', linkId);
	}

	/**
	 * Update link strength or metadata
	 */
	async updateLink(link: ContentLink): Promise<void> {
		await storage.put('links', link, 'Link updated');
	}

	/**
	 * Build a complete content graph
	 */
	async buildContentGraph(modules: ContentModule[]): Promise<ContentGraph> {
		const nodes = new Map<string, ContentGraphNode>();
		const edges = new Map<string, ContentLink>();

		// Create nodes from modules
		for (const module of modules) {
			const outgoing_links = await this.getOutgoingLinks(module.id);
			const incoming_links = await this.getIncomingLinks(module.id);

			nodes.set(module.id, {
				id: module.id,
				title: module.title,
				type: 'module',
				tags: module.metadata.tags,
				difficulty: module.metadata.difficulty,
				incomingLinks: incoming_links.map((link) => link.id),
				outgoingLinks: outgoing_links.map((link) => link.id)
			});
		}

		// Add all links as edges
		const all_links = await storage.getAll('links');
		for (const link of all_links) {
			edges.set(link.id, link);
		}

		return { nodes, edges };
	}

	/**
	 * Analyze dependency chains for a content piece
	 */
	async analyzeDependencyChain(
		contentId: string,
		completed_content = new Set()
	): Promise<DependencyChain> {
		const prerequisites = await this.getPrerequisiteChain(contentId);
		const dependents = await this.getDependentChain(contentId);

		const can_access = prerequisites.every((prereq_id) => completed_content.has(prereq_id));
		const depth = await this.calculateDependencyDepth(contentId);

		return {
			nodeId: contentId,
			prerequisites,
			dependents,
			depth,
			canAccess: can_access
		};
	}

	/**
	 * Get all prerequisites for a content piece (recursive)
	 */
	private async getPrerequisiteChain(
		contentId: string,
		visited: Set<string> = new Set()
	): Promise<string[]> {
		if (visited.has(contentId)) {
			return []; // Avoid circular dependencies
		}
		visited.add(contentId);

		const prerequisite_links = await this.getIncomingLinks(contentId);
		const direct_prerequisites = prerequisite_links
			.filter((link) => link.type === 'prerequisite')
			.map((link) => link.sourceId);

		const all_prerequisites = [...direct_prerequisites];

		// Recursively get prerequisites of prerequisites
		for (const prereq_id of direct_prerequisites) {
			const nested_prereqs = await this.getPrerequisiteChain(prereq_id, visited);
			all_prerequisites.push(...nested_prereqs);
		}

		return [...new Set(all_prerequisites)]; // Remove duplicates
	}

	/**
	 * Get all dependents for a content piece (recursive)
	 */
	private async getDependentChain(
		contentId: string,
		visited: Set<string> = new Set()
	): Promise<string[]> {
		if (visited.has(contentId)) {
			return []; // Avoid circular dependencies
		}
		visited.add(contentId);

		const dependent_links = await this.getOutgoingLinks(contentId);
		const direct_dependents = dependent_links
			.filter((link) => link.type === 'prerequisite')
			.map((link) => link.targetId);

		const all_dependents = [...direct_dependents];

		// Recursively get dependents of dependents
		for (const dep_id of direct_dependents) {
			const nested_deps = await this.getDependentChain(dep_id, visited);
			all_dependents.push(...nested_deps);
		}

		return [...new Set(all_dependents)]; // Remove duplicates
	}

	/**
	 * Calculate how deep a content piece is in the dependency tree
	 */
	private async calculateDependencyDepth(contentId: string): Promise<number> {
		const prerequisites = await this.getPrerequisiteChain(contentId);
		if (prerequisites.length === 0) {
			return 0; // Root level
		}

		// Find the maximum depth among prerequisites
		let max_depth = 0;
		for (const prereq_id of prerequisites) {
			const prereq_depth = await this.calculateDependencyDepth(prereq_id);
			max_depth = Math.max(max_depth, prereq_depth);
		}

		return max_depth + 1;
	}

	/**
	 * Find strongly connected components (detect circular dependencies)
	 */
	async findCircularDependencies(): Promise<string[][]> {
		const graph = await this.buildContentGraph(await storage.getAll('modules'));
		const visited = new Set<string>();
		const stack: string[] = [];
		const components: string[][] = [];

		// Tarjan's algorithm for finding strongly connected components
		const tarjan = (
			node_id: string,
			index: number,
			indices: Map<string, number>,
			lowlinks: Map<string, number>,
			on_stack: Set<string>
		): number => {
			indices.set(node_id, index);
			lowlinks.set(node_id, index);
			on_stack.add(node_id);
			stack.push(node_id);

			const node = graph.nodes.get(node_id);
			if (!node) return index + 1;

			Array.from(node.outgoingLinks).forEach((link_id) => {
				const link = graph.edges.get(link_id);
				if (!link || link.type !== 'prerequisite') return;

				const target_id = link.targetId;
				if (!indices.has(target_id)) {
					index = tarjan(target_id, index + 1, indices, lowlinks, on_stack);
					lowlinks.set(
						node_id,
						Math.min(lowlinks.get(node_id)!, lowlinks.get(target_id)!)
					);
				} else if (on_stack.has(target_id)) {
					lowlinks.set(
						node_id,
						Math.min(lowlinks.get(node_id)!, indices.get(target_id)!)
					);
				}
			});

			if (lowlinks.get(node_id) === indices.get(node_id)) {
				const component: string[] = [];
				let w: string;
				do {
					w = stack.pop()!;
					on_stack.delete(w);
					component.push(w);
				} while (w !== node_id);

				if (component.length > 1) {
					components.push(component);
				}
			}

			return index + 1;
		};

		const indices = new Map<string, number>();
		const lowlinks = new Map<string, number>();
		const on_stack = new Set<string>();
		let index = 0;

		Array.from(graph.nodes.keys()).forEach((node_id) => {
			if (!indices.has(node_id)) {
				index = tarjan(node_id, index, indices, lowlinks, on_stack);
			}
		});

		return components;
	}
}

// Export singleton instance
export const relationshipStorage = new RelationshipStorage();
