/**
 * Web Content Knowledge Integration Service
 * Integrates web content sourcing with the existing Interactive Knowledge System
 */

import { createLogger } from '../utils/logger.js';
import { appState, actions } from '../stores/appState.svelte.js';
import { webContentState, webContentActions } from '../stores/webContentState.svelte.js';
import type { WebContent, WebContentSource } from '../types/web-content.js';
import type { KnowledgeNode, ContentBlock } from '../types/index.js';
import webContent from '../mcp/web-content/index.js';

const logger = createLogger('web-content-knowledge-integration');

export class WebContentKnowledgeIntegration {
    private static instance: WebContentKnowledgeIntegration;

    static getInstance(): WebContentKnowledgeIntegration {
        if (!WebContentKnowledgeIntegration.instance) {
            WebContentKnowledgeIntegration.instance = new WebContentKnowledgeIntegration();
        }
        return WebContentKnowledgeIntegration.instance;
    }

    /**
     * Convert web content to knowledge node
     */
    convertToKnowledgeNode(webContent: WebContent, source?: WebContentSource): KnowledgeNode {
        logger.info(`Converting web content to knowledge node: ${webContent.title}`);

        // Create content blocks from web content
        const content_blocks = this.createContentBlocks(webContent);

        // Generate learning objectives from content
        const learning_objectives = this.generateLearningObjectives(webContent);

        // Determine difficulty level
        const difficulty = this.estimateDifficulty(webContent);

        // Extract tags and keywords
        const tags = this.extractTags(webContent);

        // Create knowledge node with proper type structure
        const knowledge_node: KnowledgeNode = {
            id: `web-content-${webContent.id || Date.now()}`,
            title: webContent.title,
            type: this.determineNodeType(webContent),
            children: [], // Initialize with empty children array
            parent: undefined, // Will be set when adding to parent
            metadata: {
                difficulty: this.mapNumericDifficultyToString(Math.min(5, Math.max(1, difficulty))),
                estimatedTime: webContent.metadata?.readingTime || this.estimateReadingTime(webContent),
                prerequisites: [],
                tags: tags
            },
            progress: {
                completed: false,
                lastAccessed: new Date()
            }
        };

        return knowledge_node;
    }

    /**
     * Create content blocks from web content
     */
    private createContentBlocks(webContent: WebContent): ContentBlock[] {
        const blocks: ContentBlock[] = [];

        // Main text content
        if (webContent.content?.text || webContent.content?.html) {
            blocks.push({
                id: crypto.randomUUID(),
                type: 'text',
                content: {
                    html: webContent.content?.html || `<p>${webContent.content?.text || ''}</p>`
                },
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    version: 1
                }
            });
        }

        // Images
        for (const image of webContent.content?.images || []) {
            blocks.push({
                id: crypto.randomUUID(),
                type: 'image',
                content: {
                    src: image.src,
                    alt: image.alt || '',
                    caption: image.caption || ''
                },
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    version: 1
                }
            });
        }

        // Code blocks
        for (const code_block of webContent.content?.codeBlocks || []) {
            blocks.push({
                id: crypto.randomUUID(),
                type: 'code',
                content: {
                    code: code_block.code,
                    language: code_block.language || 'text',
                    title: code_block.filename || '',
                    description: '',
                    executable: code_block.executable || false,
                    version: 1,
                    history: []
                },
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    version: 1
                }
            });
        }

        // Tables (convert to structured content)
        for (const table of webContent.content?.tables || []) {
            const table_html = this.convertTableToHtml(table);
            blocks.push({
                id: crypto.randomUUID(),
                type: 'text',
                content: {
                    html: table_html
                },
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    version: 1
                }
            });
        }

        return blocks;
    }

    /**
     * Convert table data to HTML
     */
    private convertTableToHtml(table: any): string {
        let html = '<table class="content-table">';

        if (table.headers && table.headers.length > 0) {
            html += '<thead><tr>';
            for (const header of table.headers) {
                html += `<th>${this.escapeHtml(header)}</th>`;
            }
            html += '</tr></thead>';
        }

        html += '<tbody>';
        for (const row of table.rows) {
            html += '<tr>';
            for (const cell of row) {
                html += `<td>${this.escapeHtml(cell)}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table>';

        return html;
    }

    /**
     * Escape HTML characters
     */
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Generate learning objectives from content
     */
    private generateLearningObjectives(webContent: WebContent): string[] {
        const objectives: string[] = [];
        const content = webContent.content.text || '';
        const title = webContent.title.toLowerCase();

        // Basic objectives based on content type
        if (title.includes('tutorial') || title.includes('how to')) {
            objectives.push('Follow step-by-step instructions');
            objectives.push('Apply learned concepts practically');
        }

        if (title.includes('introduction') || title.includes('overview')) {
            objectives.push('Understand fundamental concepts');
            objectives.push('Identify key terminology');
        }

        if (webContent.content?.codeBlocks && webContent.content.codeBlocks.length > 0) {
            objectives.push('Understand code examples');
            objectives.push('Apply programming concepts');
        }

        if (webContent.content?.tables && webContent.content.tables.length > 0) {
            objectives.push('Interpret data and information');
            objectives.push('Analyze structured information');
        }

        // Content-based objectives
        if (content.includes('example') || content.includes('demonstration')) {
            objectives.push('Learn from practical examples');
        }

        if (content.includes('concept') || content.includes('theory')) {
            objectives.push('Understand theoretical foundations');
        }

        // Default objectives if none found
        if (objectives.length === 0) {
            objectives.push('Understand the main concepts');
            objectives.push('Apply knowledge in relevant contexts');
        }

        return objectives;
    }

    /**
     * Estimate content difficulty
     */
    private estimateDifficulty(webContent: WebContent): number {
        let difficulty = 3; // Default medium difficulty
        const content = webContent.content.text || '';
        const title = webContent.title.toLowerCase();

        // Adjust based on title keywords
        if (title.includes('introduction') || title.includes('basic') || title.includes('beginner')) {
            difficulty = Math.max(1, difficulty - 1);
        }

        if (title.includes('advanced') || title.includes('expert') || title.includes('deep dive')) {
            difficulty = Math.min(5, difficulty + 2);
        }

        if (title.includes('intermediate')) {
            difficulty = 3;
        }

        // Adjust based on content complexity
        const code_block_count = webContent.content?.codeBlocks?.length || 0;
        if (code_block_count > 5) {
            difficulty = Math.min(5, difficulty + 1);
        }

        const table_count = webContent.content?.tables?.length || 0;
        if (table_count > 3) {
            difficulty = Math.min(5, difficulty + 1);
        }

        // Adjust based on reading time
        const reading_time = webContent.metadata?.readingTime || 0;
        if (reading_time > 20) {
            difficulty = Math.min(5, difficulty + 1);
        } else if (reading_time < 5) {
            difficulty = Math.max(1, difficulty - 1);
        }

        return Math.max(1, Math.min(5, difficulty));
    }

    /**
     * Extract tags from web content
     */
    private extractTags(webContent: WebContent): string[] {
        const tags = new Set<string>();

        // Add existing tags
        for (const tag of webContent.metadata?.tags || []) {
            tags.add(tag.toLowerCase());
        }

        // Add keywords
        for (const keyword of webContent.metadata?.keywords || []) {
            tags.add(keyword.toLowerCase());
        }

        // Add category
        if (webContent.metadata?.category) {
            tags.add(webContent.metadata.category.toLowerCase());
        }

        // Add domain-based tag
        if (webContent.metadata?.domain) {
            tags.add(webContent.metadata.domain.toLowerCase());
        }

        // Add content type
        if (webContent.metadata?.contentType) {
            tags.add(webContent.metadata.contentType.toLowerCase());
        }

        // Add web-content tag
        tags.add('web-content');

        return Array.from(tags);
    }

    /**
     * Estimate reading time in minutes
     */
    private estimateReadingTime(webContent: WebContent): number {
        // Average reading speed: 200 words per minute
        const wordsPerMinute = 200;

        // Get word count from metadata or calculate from text
        const wordCount = webContent.metadata?.wordCount ||
            (webContent.content?.text || '').split(/\s+/).length;

        // Return estimated minutes, at least 1 minute
        return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
    }

    /**
     * Determine knowledge node type
     */
    private determineNodeType(webContent: WebContent): 'module' | 'folder' | 'lesson' {
        const title = webContent.title.toLowerCase();
        const content_type = webContent.metadata?.contentType?.toLowerCase() || '';

        if (title.includes('tutorial') || content_type === 'tutorial') {
            return 'module'; // Changed from 'tutorial' to 'module' to match KnowledgeNode type
        }

        if (title.includes('exercise') || title.includes('practice')) {
            return 'lesson'; // Changed from 'exercise' to 'lesson' to match KnowledgeNode type
        }

        if (content_type === 'research' || title.includes('research')) {
            return 'module'; // Changed from 'reference' to 'module' to match KnowledgeNode type
        }

        if (content_type === 'documentation' || content_type === 'docs') {
            return 'module'; // Changed from 'reference' to 'module' to match KnowledgeNode type
        }

        // Default to article
        return 'module'; // Changed from 'article' to 'module' to match KnowledgeNode type
    }

    /**
     * Map numeric difficulty to string literals
     */
    private mapNumericDifficultyToString(difficulty: number): 'beginner' | 'intermediate' | 'advanced' {
        if (difficulty <= 2) {return 'beginner';}
        if (difficulty <= 3) {return 'intermediate';}
        return 'advanced';
    }

    /**
     * Find related knowledge nodes based on content similarity
     */
    private findRelatedNodes(webContent: WebContent): string[] {
        const relatedNodes: string[] = [];
        // Simple implementation - find nodes with matching tags
        if (webContent.metadata?.keywords?.length) {
            for (const [nodeId, node] of appState.content.nodes.entries()) {
                const commonTags = node.metadata.tags.filter(tag =>
                    webContent.metadata.keywords.includes(tag)
                );
                if (commonTags.length > 0) {
                    relatedNodes.push(nodeId);
                }
            }
        }
        return relatedNodes.slice(0, 5); // Limit to top 5 related nodes
    }

    /**
     * Integrate web content into knowledge system
     * @returns The ID of the created knowledge node
     */
    integrateWebContent(webContent: WebContent, source?: WebContentSource): string {
        try {
            logger.info(`Integrating web content into knowledge system: ${webContent.title}`);

            // Convert to knowledge node
            const knowledge_node = this.convertToKnowledgeNode(webContent, source);

            // Add to knowledge system
            actions.addKnowledgeNode(knowledge_node);

            // Update source with knowledge node reference if source is provided
            if (source) {
                webContentActions.updateSource(source.id, {
                    usage: {
                        timesReferenced: (source.usage?.timesReferenced || 0) + 1,
                        lastAccessed: new Date(),
                        generatedModules: [...(source.usage?.generatedModules || []), knowledge_node.id]
                    }
                });
            }

            // Return the ID of the created knowledge node
            return knowledge_node.id;
        } catch (error) {
            logger.error('Failed to integrate web content:', error);
            throw error;
        }
    }

    /**
     * Batch integrate multiple web contents
     */
    async batchIntegrateWebContent(webContents: WebContent[]): Promise<string[]> {
        const integrated_ids = [];
        const errors: any[] = [];

        for (const web_content of webContents) {
            try {
                const node_id = this.integrateWebContent(web_content);
                integrated_ids.push(node_id);
            } catch (error) {
                errors.push({ webContent: web_content.id, error });
                logger.error(`Failed to integrate web content ${web_content.id}:`, error);
            }
        }

        if (errors.length > 0) {
            logger.warn(`${errors.length} web contents failed to integrate:`, errors);
        }

        return integrated_ids;
    }

    /**
     * Update knowledge node from web content changes
     */
    updateKnowledgeNodeFromWebContent(webContent: WebContent): void {
        const knowledge_node_id = `web-content-${webContent.id}`;
        const existing_node = appState.content.nodes.get(knowledge_node_id);

        if (!existing_node) {
            logger.warn(`Knowledge node not found for web content: ${webContent.id}`);
            return;
        }

        try {
            // Create updated content blocks
            const updated_blocks = this.createContentBlocks(webContent);

            // Update the knowledge node with valid properties
            const updateData: Partial<KnowledgeNode> = {
                title: webContent.title,
                metadata: {
                    ...existing_node.metadata,
                    tags: this.extractTags(webContent)
                }
            };

            // Only include the blocks if they exist in the KnowledgeNode type
            if ('blocks' in existing_node) {
                (updateData as any).blocks = updated_blocks;
            }

            actions.updateKnowledgeNode(knowledge_node_id, updateData);

            logger.info(`Updated knowledge node from web content: ${knowledge_node_id}`);

        } catch (error) {
            logger.error(`Failed to update knowledge node from web content:`, error);
            throw error;
        }
    }

    /**
     * Remove knowledge node when web content is deleted
     */
    removeKnowledgeNodeForWebContent(webContentId: string): void {
        const knowledge_node_id = `web-content-${webContentId}`;
        const existing_node = appState.content.nodes.get(knowledge_node_id);

        if (existing_node) {
            actions.removeKnowledgeNode(knowledge_node_id);
            logger.info(`Removed knowledge node for deleted web content: ${knowledge_node_id}`);
        }
    }
}

// Export singleton instance
export const webContentKnowledgeIntegration = WebContentKnowledgeIntegration.getInstance();