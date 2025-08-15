/**
 * Content relationship and linking system types
 */

/**
 * Types of relationships between content pieces
 */
export type RelationshipType =
	| 'prerequisite' // A must be completed before B
	| 'dependent' // B depends on A being completed
	| 'related' // A and B are topically related
	| 'similar' // A and B have similar content/difficulty
	| 'sequence' // A comes before B in a sequence
	| 'reference' // A references B
	| 'example' // A is an example of concept in B
	| 'practice' // A provides practice for concepts in B
	| 'follows' // A follows B in sequence
	| 'references' // A references B
	| 'contradicts' // A contradicts B
	| 'duplicate' // A is a duplicate of B
	| 'conceptual' // A is conceptually related to B
	| 'weak'; // A has a weak relationship to B

/**
 * Strength of relationship between content pieces
 */
export type RelationshipStrength = 'strong' | 'medium' | 'weak' | 'very-weak';

/**
 * Bidirectional link between two content pieces
 */
export interface ContentLink {
	id: string;
	sourceId: string;
	targetId: string;
	type: RelationshipType;
	strength: number; // 0-1, how strong the relationship is
	metadata: {
		created: Date;
		createdBy: string;
		description?: string;
		automatic: boolean; // true if created by algorithm, false if manual
	};
}

/**
 * Enhanced content relationship with confidence and metadata
 */
export interface ContentRelationship {
	id: string;
	sourceId: string;
	targetId: string;
	type: string;
	strength: RelationshipStrength;
	confidence: number; // 0-1, confidence in the relationship
	metadata?: {
		created: Date;
		detectionMethod: 'automatic' | 'manual' | 'suggested';
		similarities?: unknown;
		analysisDepth?: 'shallow' | 'medium' | 'deep';
		suggestionReason?: string;
	};
}

/**
 * Graph representation of content relationships
 */
export interface ContentGraph {
	nodes: Map<string, ContentGraphNode>;
	edges: Map<string, ContentLink>;
}

/**
 * Node in the content relationship graph
 */
export interface ContentGraphNode {
	id: string;
	title: string;
	type: 'module' | 'lesson' | 'concept';
	tags: string[];
	difficulty: number;
	incomingLinks: string[]; // Link IDs pointing to this node
	outgoingLinks: string[]; // Link IDs originating from this node
	position?: { x: number; y: number }; // For visual layout
}

/**
 * Dependency chain analysis result
 */
export interface DependencyChain {
	nodeId: string;
	prerequisites: string[]; // All nodes that must be completed first
	dependents: string[]; // All nodes that depend on this one
	depth: number; // How deep in the dependency tree
	canAccess: boolean; // Whether user can access based on completed prerequisites
}

/**
 * Content similarity analysis
 */
export interface SimilarityScore {
	contentId: string;
	score: number; // 0-1, how similar to the reference content
	reasons: SimilarityReason[];
}

export interface SimilarityReason {
	type: 'tags' | 'difficulty' | 'content' | 'structure' | 'user-behavior';
	score: number;
	details: string;
}

/**
 * Recommendation based on relationships and user behavior
 */
export interface ContentRecommendation {
	contentId: string;
	score: number; // 0-1, how strongly recommended
	reasons: RecommendationReason[];
	type: 'next-in-sequence' | 'related-topic' | 'practice' | 'review' | 'similar-difficulty';
}

export interface RecommendationReason {
	type:
	| 'prerequisite-completed'
	| 'similar-content'
	| 'user-interest'
	| 'difficulty-match'
	| 'topic-continuation';
	weight: number;
	description: string;
}

/**
 * Knowledge map visualization data
 */
export interface KnowledgeMap {
	id: string;
	title: string;
	description: string;
	nodes: KnowledgeMapNode[];
	connections: KnowledgeMapConnection[];
	layout: 'hierarchical' | 'force-directed' | 'circular' | 'grid';
	filters: {
		showCompleted: boolean;
		showPrerequisites: boolean;
		difficultyRange: [number, number];
		tags: string[];
	};
}

export interface KnowledgeMapNode {
	id: string;
	contentId: string;
	title: string;
	type: 'concept' | 'skill' | 'topic' | 'milestone';
	status: 'locked' | 'available' | 'in-progress' | 'completed';
	position: { x: number; y: number };
	size: number; // Visual size based on importance/content amount
	color: string; // Color coding based on topic/difficulty
	// D3 force simulation properties
	x?: number;
	y?: number;
	fx?: number | null;
	fy?: number | null;
}

export interface KnowledgeMapConnection {
	id: string;
	sourceId: string;
	targetId: string;
	type: RelationshipType;
	strength: number;
	style: 'solid' | 'dashed' | 'dotted';
	color: string;
}
