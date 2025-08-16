/**
 * Template and Asset Management Tools
 * Implementation of template and asset management for web content sourcing
 * Using existing TemplateAssetTools patterns
 */

import { createLogger } from '../../utils/logger';
import type {
	WebContent,
	VisualizationConfig,
	SimulationParameter
} from '../../types/unified';

export interface ContentTemplate {
	id: string;
	name: string;
	description: string;
	type: 'content' | 'visualization' | 'simulation' | 'quiz';
	category: string;
	config: any;
	variables: Record<string, any>;
	createdAt: Date;
	updatedAt: Date;
	usageCount: number;
}

export interface AssetOptimizationResult {
	assetId: string;
	originalSize: number;
	optimizedSize: number;
	compressionRatio: number;
	optimizationType: string;
	success: boolean;
	error?: string;
}

export class TemplateAssetTools {
	private logger = createLogger('mcp:template-asset-tools');
	private templates = new Map<string, ContentTemplate>();
	private assetCache = new Map<string, any>();

	constructor() {
		this.initializeDefaultTemplates();
	}

	/**
	 * Initialize default templates
	 */
	private initializeDefaultTemplates(): void {
		const default_templates: Array<
			Omit<ContentTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
		> = [
			{
				name: 'Article Template',
				description: 'Standard article layout with header, content, and footer',
				type: 'content',
				category: 'article',
				config: {
					layout: 'single-column',
					showAuthor: true,
					showDate: true,
					showTags: true
				},
				variables: {
					title: { type: 'string', required: true },
					content: { type: 'string', required: true },
					author: { type: 'string', required: false },
					publishDate: { type: 'date', required: false },
					tags: { type: 'array', required: false }
				}
			},
			{
				name: 'Interactive Chart Template',
				description: 'Template for creating interactive data visualizations',
				type: 'visualization',
				category: 'chart',
				config: {
					chartType: 'line',
					interactive: true,
					responsive: true,
					showLegend: true
				},
				variables: {
					data: { type: 'object', required: true },
					title: { type: 'string', required: true },
					xAxisLabel: { type: 'string', required: false },
					yAxisLabel: { type: 'string', required: false }
				}
			},
			{
				name: 'Neural Network Simulation',
				description: 'Template for neural network visualization and simulation',
				type: 'simulation',
				category: 'machine-learning',
				config: {
					layers: [3, 4, 4, 2],
					activationFunction: 'relu',
					interactive: true,
					showWeights: true
				},
				variables: {
					inputSize: { type: 'number', required: true },
					hiddenLayers: { type: 'array', required: true },
					outputSize: { type: 'number', required: true },
					learningRate: { type: 'number', required: false, default: 0.01 }
				}
			},
			{
				name: 'Quiz Template',
				description: 'Template for creating interactive quizzes',
				type: 'quiz',
				category: 'assessment',
				config: {
					questionType: 'multiple-choice',
					showFeedback: true,
					randomizeOptions: true,
					allowRetry: true
				},
				variables: {
					questions: { type: 'array', required: true },
					timeLimit: { type: 'number', required: false },
					passingScore: { type: 'number', required: false, default: 70 }
				}
			}
		];

		default_templates.forEach((template) => {
			const id = `template_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
			this.templates.set(id, {
				...template,
				id,
				createdAt: new Date(),
				updatedAt: new Date(),
				usageCount: 0
			});
		});

		this.logger.info('Default templates initialized', {
			templateCount: this.templates.size
		});
	}

	/**
	 * List available templates
	 */
	async listTemplates(filters?: { type?: string; category?: string; search?: string }): Promise<{
		templates: ContentTemplate[];
		total: number;
	}> {
		this.logger.info('Listing templates', { filters });

		try {
			let templates = Array.from(this.templates.values());

			// Apply filters
			if (filters) {
				if (filters.type) {
					templates = templates.filter((t) => t.type === filters.type);
				}
				if (filters.category) {
					templates = templates.filter((t) => t.category === filters.category);
				}
				if (filters.search) {
					const search_lower = filters.search.toLowerCase();
					templates = templates.filter(
						(t) =>
							t.name.toLowerCase().includes(search_lower) ||
							t.description.toLowerCase().includes(search_lower)
					);
				}
			}

			// Sort by usage count (most used first), then by name
			templates.sort((a, b) => {
				if (a.usageCount !== b.usageCount) {
					return b.usageCount - a.usageCount;
				}
				return a.name.localeCompare(b.name);
			});

			return {
				templates,
				total: templates.length
			};
		} catch (error) {
			this.logger.error('Failed to list templates:', error);
			throw new Error(
				`Failed to list templates: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Create a new template
	 */
	async createTemplate(args: {
		name: string;
		description: string;
		type: 'content' | 'visualization' | 'simulation' | 'quiz';
		category: string;
		config: any;
		variables: Record<string, any>;
	}): Promise<{
		templateId: string;
		template: ContentTemplate;
	}> {
		const { name, description, type, category, config, variables } = args;

		this.logger.info('Creating new template', { name, type, category });

		try {
			const template_id = `template_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

			const template: ContentTemplate = {
				id: template_id,
				name,
				description,
				type,
				category,
				config,
				variables,
				createdAt: new Date(),
				updatedAt: new Date(),
				usageCount: 0
			};

			this.templates.set(template_id, template);

			this.logger.info('Template created successfully', {
				templateId: template_id,
				name,
				type
			});

			return {
				templateId: template_id,
				template
			};
		} catch (error) {
			this.logger.error('Failed to create template:', error);
			throw new Error(
				`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Update an existing template
	 */
	async updateTemplate(
		templateId: string,
		updates: {
			name?: string;
			description?: string;
			config?: any;
			variables?: Record<string, any>;
		}
	): Promise<{
		templateId: string;
		template: ContentTemplate;
		updated: boolean;
	}> {
		this.logger.info('Updating template', { templateId, updates });

		try {
			const template = this.templates.get(templateId);
			if (!template) {
				throw new Error(`Template not found: ${templateId}`);
			}

			let updated = false;

			if (updates.name && updates.name !== template.name) {
				template.name = updates.name;
				updated = true;
			}

			if (updates.description && updates.description !== template.description) {
				template.description = updates.description;
				updated = true;
			}

			if (updates.config) {
				template.config = { ...template.config, ...updates.config };
				updated = true;
			}

			if (updates.variables) {
				template.variables = { ...template.variables, ...updates.variables };
				updated = true;
			}

			if (updated) {
				template.updatedAt = new Date();
			}

			this.logger.info('Template updated successfully', {
				templateId,
				updated
			});

			return {
				templateId,
				template,
				updated
			};
		} catch (error) {
			this.logger.error('Failed to update template:', error);
			throw new Error(
				`Failed to update template: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Delete a template
	 */
	async deleteTemplate(templateId: string): Promise<{
		templateId: string;
		deleted: boolean;
		template?: ContentTemplate;
	}> {
		this.logger.info('Deleting template', { templateId });

		try {
			const template = this.templates.get(templateId);
			if (!template) {
				return {
					templateId: templateId,
					deleted: false
				};
			}

			this.templates.delete(templateId);

			this.logger.info('Template deleted successfully', { templateId });

			return {
				templateId,
				deleted: true,
				template
			};
		} catch (error) {
			this.logger.error('Failed to delete template:', error);
			throw new Error(
				`Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Apply a template to content
	 */
	async applyTemplate(args: {
		templateId: string;
		content: WebContent;
		variables?: Record<string, any>;
		customConfig?: any;
	}): Promise<{
		success: boolean;
		result: any;
		templateUsed: string;
		appliedAt: Date;
	}> {
		const { templateId, content, variables = {}, customConfig = {} } = args;

		this.logger.info('Applying template to content', {
			templateId: templateId,
			contentId: content.id,
			variableCount: Object.keys(variables).length
		});

		try {
			const template = this.templates.get(templateId);
			if (!template) {
				throw new Error(`Template not found: ${templateId}`);
			}

			// Validate required variables
			const missing_variables = [];
			for (const [varName, var_config] of Object.entries(template.variables)) {
				if (var_config.required && !(varName in variables)) {
					// Try to extract from content
					const extracted_value = this.extractVariableFromContent(varName, content);
					if (extracted_value !== null) {
						variables[varName] = extracted_value;
					} else {
						missing_variables.push(varName);
					}
				}
			}

			if (missing_variables.length > 0) {
				throw new Error(`Missing required variables: ${missing_variables.join(', ')}`);
			}

			// Apply template based on type
			let result;
			switch (template.type) {
				case 'content':
					result = await this.applyContentTemplate(template, content, variables, customConfig);
					break;
				case 'visualization':
					result = await this.applyVisualizationTemplate(
						template,
						content,
						variables,
						customConfig
					);
					break;
				case 'simulation':
					result = await this.applySimulationTemplate(template, content, variables, customConfig);
					break;
				case 'quiz':
					result = await this.applyQuizTemplate(template, content, variables, customConfig);
					break;
				default:
					throw new Error(`Unknown template type: ${template.type}`);
			}

			// Update usage count
			template.usageCount++;
			template.updatedAt = new Date();

			this.logger.info('Template applied successfully', {
				templateId: templateId,
				contentId: content.id,
				templateType: template.type
			});

			return {
				success: true,
				result,
				templateUsed: template.name,
				appliedAt: new Date()
			};
		} catch (error) {
			this.logger.error('Failed to apply template:', error);
			throw new Error(
				`Failed to apply template: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Optimize content assets
	 */
	async optimizeAssets(args: {
		contentId: string;
		assets: Array<{
			id: string;
			type: 'image' | 'video' | 'audio' | 'document';
			url: string;
			size: number;
		}>;
		options?: {
			compressImages?: boolean;
			optimizeForMobile?: boolean;
			generateThumbnails?: boolean;
			maxImageWidth?: number;
			quality?: number;
		};
	}): Promise<{
		contentId: string;
		results: AssetOptimizationResult[];
		summary: {
			totalAssets: number;
			optimized: number;
			failed: number;
			totalSizeBefore: number;
			totalSizeAfter: number;
			compressionRatio: number;
		};
	}> {
		const { contentId, assets, options = {} } = args;
		const {
			compressImages = true,
			optimizeForMobile = true,
			generateThumbnails = false,
			maxImageWidth = 1920,
			quality = 85
		} = options;

		this.logger.info('Optimizing content assets', {
			contentId,
			assetCount: assets.length,
			options
		});

		try {
			const results: AssetOptimizationResult[] = [];
			let total_size_before = 0;
			let total_size_after = 0;

			for (const asset of assets) {
				total_size_before += asset.size;

				try {
					const optimization_result = await this.optimizeAsset(asset, {
						compressImages,
						optimizeForMobile,
						generateThumbnails,
						maxImageWidth,
						quality
					});

					results.push(optimization_result);
					total_size_after += optimization_result.optimizedSize;
				} catch (error) {
					results.push({
						assetId: asset.id,
						originalSize: asset.size,
						optimizedSize: asset.size,
						compressionRatio: 1.0,
						optimizationType: 'none',
						success: false,
						error: error instanceof Error ? error.message : 'Unknown error'
					});
					total_size_after += asset.size;
				}
			}

			const summary = {
				totalAssets: assets.length,
				optimized: results.filter((r) => r.success).length,
				failed: results.filter((r) => !r.success).length,
				totalSizeBefore: total_size_before,
				totalSizeAfter: total_size_after,
				compressionRatio: total_size_before > 0 ? total_size_after / total_size_before : 1.0
			};

			this.logger.info('Asset optimization completed', {
				contentId,
				...summary
			});

			return {
				contentId,
				results,
				summary
			};
		} catch (error) {
			this.logger.error('Asset optimization failed:', error);
			throw new Error(
				`Asset optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Generate asset thumbnails
	 */
	async generateThumbnails(args: {
		assets: Array<{
			id: string;
			type: 'image' | 'video';
			url: string;
		}>;
		sizes?: Array<{ width: number; height: number; name: string }>;
	}): Promise<{
		thumbnails: Array<{
			assetId: string;
			thumbnails: Array<{
				size: string;
				url: string;
				width: number;
				height: number;
			}>;
			success: boolean;
			error?: string;
		}>;
	}> {
		const {
			assets,
			sizes = [
				{ width: 150, height: 150, name: 'thumbnail' },
				{ width: 300, height: 300, name: 'small' },
				{ width: 600, height: 600, name: 'medium' }
			]
		} = args;

		this.logger.info('Generating asset thumbnails', {
			assetCount: assets.length,
			sizeCount: sizes.length
		});

		try {
			const thumbnails = [];

			for (const asset of assets) {
				try {
					// Mock thumbnail generation
					const asset_thumbnails = sizes.map((size) => ({
						size: size.name,
						url: `${asset.url}_${size.name}_${size.width}x${size.height}`,
						width: size.width,
						height: size.height
					}));

					thumbnails.push({
						assetId: asset.id,
						thumbnails: asset_thumbnails,
						success: true
					});
				} catch (error) {
					thumbnails.push({
						assetId: asset.id,
						thumbnails: [],
						success: false,
						error: error instanceof Error ? error.message : 'Unknown error'
					});
				}
			}

			this.logger.info('Thumbnail generation completed', {
				totalAssets: assets.length,
				successful: thumbnails.filter((t) => t.success).length
			});

			return { thumbnails };
		} catch (error) {
			this.logger.error('Thumbnail generation failed:', error);
			throw new Error(
				`Thumbnail generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	// Private helper methods

	/**
	 * Extract variable value from content
	 */
	private extractVariableFromContent(varName: string, content: WebContent): any {
		switch (varName) {
			case 'title':
				return content.title;
			case 'content':
				return content.content.text;
			case 'author':
				return content.metadata.author;
			case 'publishDate':
				return content.metadata.publishDate;
			case 'tags':
				return content.metadata.tags;
			case 'data':
				return content.content.charts?.[0]?.data || null;
			default:
				return null;
		}
	}

	/**
	 * Apply content template
	 */
	private async applyContentTemplate(
		template: ContentTemplate,
		content: WebContent,
		variables: Record<string, any>,
		customConfig: any
	): Promise<any> {
		const config = { ...template.config, ...customConfig };

		return {
			type: 'content',
			template: template.name,
			config,
			content: {
				title: variables.title || content.title,
				body: variables.content || content.content.text,
				author: variables.author || content.metadata.author,
				publishDate: variables.publishDate || content.metadata.publishDate,
				tags: variables.tags || content.metadata.tags,
				layout: config.layout,
				showAuthor: config.showAuthor,
				showDate: config.showDate,
				showTags: config.showTags
			}
		};
	}

	/**
	 * Apply visualization template
	 */
	private async applyVisualizationTemplate(
		template: ContentTemplate,
		content: WebContent,
		variables: Record<string, any>,
		customConfig: any
	): Promise<any> {
		const config = { ...template.config, ...customConfig };

		return {
			type: 'interactive-visualization',
			template: template.name,
			config,
			visualization: {
				type: config.chartType || 'line',
				data: variables.data || this.extractChartData(content),
				title: variables.title || content.title,
				xAxisLabel: variables.xAxisLabel,
				yAxisLabel: variables.yAxisLabel,
				interactive: config.interactive,
				responsive: config.responsive,
				showLegend: config.showLegend
			}
		};
	}

	/**
	 * Apply simulation template
	 */
	private async applySimulationTemplate(
		template: ContentTemplate,
		content: WebContent,
		variables: Record<string, any>,
		customConfig: any
	): Promise<any> {
		const config = { ...template.config, ...customConfig };

		const parameters: SimulationParameter[] = [
			{
				name: 'learningRate',
				type: 'number',
				min: 0.001,
				max: 1.0,
				step: 0.001,
				default: variables.learningRate || 0.01,
				description: 'Learning rate for training'
			},
			{
				name: 'epochs',
				type: 'number',
				min: 1,
				max: 1000,
				step: 1,
				default: 100,
				description: 'Number of training epochs'
			}
		];

		return {
			type: 'simulation',
			template: template.name,
			config,
			simulation: {
				type: template.category,
				layers: config.layers,
				activationFunction: config.activationFunction,
				parameters,
				interactive: config.interactive,
				showWeights: config.showWeights,
				initialState: {
					weights: this.generateRandomWeights(config.layers),
					biases: this.generateRandomBiases(config.layers)
				}
			}
		};
	}

	/**
	 * Apply quiz template
	 */
	private async applyQuizTemplate(
		template: ContentTemplate,
		content: WebContent,
		variables: Record<string, any>,
		customConfig: any
	): Promise<any> {
		const config = { ...template.config, ...customConfig };

		return {
			type: 'quiz',
			template: template.name,
			config,
			quiz: {
				questions: variables.questions || this.generateQuestionsFromContent(content),
				questionType: config.questionType,
				showFeedback: config.showFeedback,
				randomizeOptions: config.randomizeOptions,
				allowRetry: config.allowRetry,
				timeLimit: variables.timeLimit,
				passingScore: variables.passingScore || 70
			}
		};
	}

	/**
	 * Optimize a single asset
	 */
	private async optimizeAsset(
		asset: { id: string; type: string; url: string; size: number },
		options: any
	): Promise<AssetOptimizationResult> {
		// Mock asset optimization
		let optimized_size = asset.size;
		let optimization_type = 'none';

		if (asset.type === 'image' && options.compressImages) {
			// Simulate image compression (30-70% size reduction)
			const compression_ratio = 0.3 + Math.random() * 0.4;
			optimized_size = Math.floor(asset.size * compression_ratio);
			optimization_type = 'image_compression';
		} else if (asset.type === 'video') {
			// Simulate video optimization (20-50% size reduction)
			const compression_ratio = 0.5 + Math.random() * 0.3;
			optimized_size = Math.floor(asset.size * compression_ratio);
			optimization_type = 'video_compression';
		}

		return {
			assetId: asset.id,
			originalSize: asset.size,
			optimizedSize: optimized_size,
			compressionRatio: optimized_size / asset.size,
			optimizationType: optimization_type,
			success: true
		};
	}

	/**
	 * Extract chart data from content
	 */
	private extractChartData(content: WebContent): any {
		if (content.content.charts && content.content.charts.length > 0) {
			return content.content.charts[0].data;
		}

		// Generate mock data
		return {
			labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
			datasets: [
				{
					label: 'Data Series',
					data: [10, 20, 15, 25, 30],
					backgroundColor: '#1f77b4'
				}
			]
		};
	}

	/**
	 * Generate random weights for neural network
	 */
	private generateRandomWeights(layers: number[]): number[][][] {
		const weights = [];
		for (let i = 0; i < layers.length - 1; i++) {
			const layer_weights = [];
			for (let j = 0; j < layers[i]; j++) {
				const node_weights = [];
				for (let k = 0; k < layers[i + 1]; k++) {
					node_weights.push((Math.random() - 0.5) * 2);
				}
				layer_weights.push(node_weights);
			}
			weights.push(layer_weights);
		}
		return weights;
	}

	/**
	 * Generate random biases for neural network
	 */
	private generateRandomBiases(layers: number[]): number[][] {
		const biases = [];
		for (let i = 1; i < layers.length; i++) {
			const layer_biases = [];
			for (let j = 0; j < layers[i]; j++) {
				layer_biases.push((Math.random() - 0.5) * 2);
			}
			biases.push(layer_biases);
		}
		return biases;
	}

	/**
	 * Generate quiz questions from content
	 */
	private generateQuestionsFromContent(content: WebContent): any[] {
		const sentences: string[] = content.content.text
			.split('.')
			.filter((s: string) => s.trim().length > 20);
		const random_sentences = sentences.sort(() => 0.5 - Math.random()).slice(0, 3);

		return random_sentences.map((sentence: string, index: number) => ({
			id: `q_${index}`,
			type: 'multiple-choice',
			question: `What is the main concept in: "${sentence.trim()}"?`,
			options: ['Concept A', 'Concept B', 'Concept C', 'Concept D'],
			correctAnswer: 0,
			explanation: 'This question was generated from the content.',
			points: 1
		}));
	}
}
