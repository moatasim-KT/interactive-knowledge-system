/**
 * Web Content Knowledge Integration Service
 * Integrates web content sourcing with the existing Interactive Knowledge System
 */

import { createLogger } from '$lib/utils/logger.js';
import { appState, actions } from '$lib/stores/appState.svelte.js';
import { webContentState, webContentActions } from '$lib/stores/webContentState.svelte.js';
import type { WebContent, WebContentSource } from '$lib/types/web-content.js';
import type { KnowledgeNode, ContentBlock } from '$lib/types/index.js';
import webContent from '$lib/mcp/web-content';

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

        // Create knowledge node
        const knowledge_node = {
            id: `web-content-${web_content.id}`,
            title: web_content.title,
            type: this.determineNodeType(web_content),
            content: {
                blocks: content_blocks
            },
            metadata: {
                description: web_content.metadata.description || this.generateDescription(web_content),
                tags,
                difficulty,
                estimatedTime: web_content.metadata.readingTime || this.estimateReadingTime(web_content),
                prerequisites: [],
                learningObjectives: learning_objectives,
                created: new Date(web_content.fetchedAt),
                modified: new Date(),
                version: 1,
                author: web_content.metadata.author || 'Web Import',
                source: web_content.url
            },
            relationships: {
                prerequisites: [],
                dependents: [],
                related: [],
                partOf: []
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
        if (web_content.content.text || web_content.content.html) {
            blocks.push({
                id: crypto.randomUUID(),
                type: 'text',
                content: {
                    html: web_content.content.html || `<p>${web_content.content.text}</p>`
                },
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    version: 1
                }
            });
        }

        // Images
        for (const image of web_content.content.images || []) {
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
        for (const code_block of web_content.content.codeBlocks || []) {
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
        for (const table of web_content.content.tables || []) {
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
        const content = web_content.content.text || '';
        const title = web_content.title.toLowerCase();

        // Basic objectives based on content type
        if (title.includes('tutorial') || title.includes('how to')) {
            objectives.push('Follow step-by-step instructions');
            objectives.push('Apply learned concepts practically');
        }

        if (title.includes('introduction') || title.includes('overview')) {
            objectives.push('Understand fundamental concepts');
            objectives.push('Identify key terminology');
        }

        if (web_content.content.codeBlocks && web_content.content.codeBlocks.length > 0) {
            objectives.push('Understand code examples');
            objectives.push('Apply programming concepts');
        }

        if (web_content.content.tables && web_content.content.tables.length > 0) {
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
        const content = web_content.content.text || '';
        const title = web_content.title.toLowerCase();

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
        const code_block_count = web_content.content.codeBlocks?.length || 0;
        if (code_block_count > 5) {
            difficulty = Math.min(5, difficulty + 1);
        }

        const table_count = web_content.content.tables?.length || 0;
        if (table_count > 3) {
            difficulty = Math.min(5, difficulty + 1);
        }

        // Adjust based on reading time
        const reading_time = web_content.metadata.readingTime || 0;
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
        for (const tag of web_content.metadata.tags || []) {
            tags.add(tag.toLowerCase());
        }

        // Add keywords
        for (const keyword of web_content.metadata.keywords || []) {
            tags.add(keyword.toLowerCase());
        }

        // Add category
        if (web_content.metadata.category) {
            tags.add(web_content.metadata.category.toLowerCase());
        }

        // Add domain-based tag
        tags.add(web_content.metadata.domain.toLowerCase());

        // Add content type
        tags.add(web_content.metadata.contentType.toLowerCase());

        // Add web-content tag
        tags.add('web-content');

        return Array.from(tags);
    }

    /**
     * Determine knowledge node type
     */
    private determineNodeType(webContent: WebContent): KnowledgeNode['type'] {
        const title = web_content.title.toLowerCase();
        const content_type = web_content.metadata.contentType.toLowerCase();

        if (title.includes('tutorial') || content_type === 'tutorial') {
            return 'tutorial';
        }

        if (title.includes('exercise') || title.includes('practice')) {
            return 'exercise';
        }

        if (content_type === 'research' || title.includes('research')) {
            return 'reference';
        }

        if (content_type === 'documentation' || content_type === 'docs') {
            return 'reference';
        }

        // Default to article
        return 'article';
    }

    /**
     * Generate description from content
     */
    private generateDescription(webContent: WebContent): string {
        if (web_content.metadata.description) {
            return web_content.metadata.description;
        }

        // Extract first paragraph or first 200 characters
        const text = web_content.content.text || '';
        const first_paragraph = text.split('\n')[0];

        if (first_paragraph.length > 20) {
            return first_paragraph.length > 200
                ? first_paragraph.substring(0, 200) + '...'
                : first_paragraph;
        }

        return text.length > 200
            ? text.substring(0, 200) + '...'
            : text;
    }

    /**
     * Estimate reading time if not provided
     */
    private estimateReadingTime(webContent: WebContent): number {
        if (web_content.metadata.readingTime) {
            return web_content.metadata.readingTime;
        }

        const word_count = web_content.metadata.wordCount ||
            (web_content.content.text || '').split(/\s+/).length;

        return Math.max(1, Math.ceil(word_count / 200)); // 200 words per minute
    }

    /**
     * Find related knowledge nodes
     */
    findRelatedNodes(webContent: WebContent): string[] {
        const related_ids = [];
        const content_tags = this.extractTags(web_content);
        const content_text = web_content.content.text?.toLowerCase() || '';

        // Search existing knowledge nodes
        for (const [node_id, node] of appState.content.nodes) {
            let relevance_score = 0;

            // Tag matching
            const common_tags = node.metadata.tags.filter(tag =>
                content_tags.includes(tag.toLowerCase())
            );
            relevance_score += common_tags.length * 2;

            // Title similarity
            const title_words = node.title.toLowerCase().split(/\s+/);
            const content_title_words = web_content.title.toLowerCase().split(/\s+/);
            const common_title_words = title_words.filter(word =>
                content_title_words.includes(word) && word.length > 3
            );
            relevance_score += common_title_words.length;

            // Content similarity (basic keyword matching)
            const node_text = this.extractTextFromBlocks(node.content.blocks).toLowerCase();
            const common_words = this.findCommonWords(content_text, node_text);
            relevance_score += common_words.length * 0.5;

            // Consider related if relevance score is high enough
            if (relevance_score >= 3) {
                related_ids.push(node_id);
            }
        }

        return related_ids.slice(0, 10); // Limit to top 10 related nodes
    }

    /**
     * Extract text from content blocks
     */
    private extractTextFromBlocks(blocks: ContentBlock[]): string {
        return blocks
            .filter(block => block.type === 'text')
            .map(block => {
                if (typeof block.content === 'object' && 'html' in block.content) {
                    // Strip HTML tags
                    return block.content.html.replace(/<[^>]*>/g, ' ');
                }
                return '';
            })
            .join(' ');
    }

    /**
     * Find common meaningful words between two texts
     */
    private findCommonWords(text1: string, text2: string): string[] {
        const stop_words = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);

        const words1 = text1.split(/\s+/).filter(word =>
            word.length > 3 && !stop_words.has(word.toLowerCase())
        );
        const words2 = text2.split(/\s+/).filter(word =>
            word.length > 3 && !stop_words.has(word.toLowerCase())
        );

        return words1.filter(word => words2.includes(word));
    }

    /**
     * Integrate web content into knowledge system
     */
    integrateWebContent(webContent: WebContent, source?: WebContentSource): string {
        try {
            logger.info(`Integrating web content into knowledge system: ${web_content.title}`);

            // Convert to knowledge node
            const knowledge_node = this.convertToKnowledgeNode(webContent, source);

            // Find related nodes
            const related_node_ids = this.findRelatedNodes(webContent);
            knowledge_node.relationships.related = related_node_ids;

            // Add to knowledge system
            actions.addKnowledgeNode(knowledge_node);

            // Update relationships in related nodes
            for (const related_id of related_node_ids) {
                const related_node = appState.content.nodes.get(related_id);
                if (related_node && !related_node.relationships.related.includes(knowledge_node.id)) {
                    actions.updateKnowledgeNode(related_id, {
                        relationships: {
                            ...related_node.relationships,
                            related: [...related_node.relationships.related, knowledge_node.id]
                        }
                    });
                }
            }

            // Update source with knowledge node reference
            if (source) {
                webContentActions.updateSource(source.id, {
                    usage: {
                        ...source.usage,
                        generatedModules: [...source.usage.generatedModules, knowledge_node.id]
                    }
                });
            }

            logger.info(`Successfully integrated web content as knowledge node: ${knowledge_node.id}`);
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
                const node_id = this.integrateWebContent(webContent);
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
        const knowledge_node_id = `web-content-${web_content.id}`;
        const existing_node = appState.content.nodes.get(knowledge_node_id);

        if (!existing_node) {
            logger.warn(`Knowledge node not found for web content: ${web_content.id}`);
            return;
        }

        try {
            // Create updated content blocks
            const updated_blocks = this.createContentBlocks(webContent);

            // Update the knowledge node
            actions.updateKnowledgeNode(knowledge_node_id, {
                title: web_content.title,
                content: {
                    blocks: updated_blocks
                },
                metadata: {
                    ...existing_node.metadata,
                    description: web_content.metadata.description || existing_node.metadata.description,
                    tags: this.extractTags(web_content),
                    modified: new Date(),
                    version: existing_node.metadata.version + 1
                }
            });

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