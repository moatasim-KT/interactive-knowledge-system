import type { ContentBlock } from '../types/unified';
import { createLogger } from '../utils/logger';

const logger = createLogger('interactive-document-generator');

export class InteractiveDocumentGenerator {
    /**
     * Generates an HTML preview from an array of ContentBlock objects.
     * @param blocks The content blocks to render.
     * @returns A string containing the HTML representation of the blocks.
     */
    generatePreviewHtml(blocks: ContentBlock[]): string {
        logger.info('Generating HTML preview for interactive document', { numBlocks: blocks.length });
        let html = '';

        blocks.forEach(block => {
            switch (block.type) {
                case 'text':
                    html += `<div class="preview-text">${block.content.html || '<p>No text content</p>'}</div>`;
                    break;
                case 'code':
                    html += `<div class="preview-code"><pre><code>${block.content.code || '// No code content'}</code></pre></div>`;
                    break;
                case 'quiz':
                    html += `<div class="preview-quiz"><h4>${block.content.question || 'No question'}</h4><ul>`;
                    (block.content.options || []).forEach((option: string, index: number) => {
                        html += `<li>${index + 1}. ${option}</li>`;
                    });
                    html += `</ul></div>`;
                    break;
                case 'interactive-visualization':
                    html += `<div class="preview-visualization">Interactive Visualization: ${block.content.type || 'Unknown'}</div>`;
                    break;
                case 'interactive-chart':
                    html += `<div class="preview-chart">Interactive Chart: ${block.content.type || 'Unknown'}</div>`;
                    break;
                case 'image':
                    html += `<div class="preview-image"><img src="${block.content.src}" alt="${block.content.alt || 'Image'}" /></div>`;
                    break;
                case 'video':
                    html += `<div class="preview-video"><video controls src="${block.content.src}"></video></div>`;
                    break;
                case 'flashcard':
                    html += `<div class="preview-flashcard"><div class="front">${block.content.front}</div><div class="back">${block.content.back}</div></div>`;
                    break;
                case 'diagram':
                    html += `<div class="preview-diagram">Diagram: ${block.content.type || 'Unknown'}</div>`;
                    break;
                case 'simulation':
                    html += `<div class="preview-simulation">Simulation: ${block.content.type || 'Unknown'}</div>`;
                    break;
                default:
                    html += `<div class="preview-unknown">Unsupported Block Type: ${block.type}</div>`;
            }
        });

        return html;
    }
}

export const interactiveDocumentGenerator = new InteractiveDocumentGenerator();
