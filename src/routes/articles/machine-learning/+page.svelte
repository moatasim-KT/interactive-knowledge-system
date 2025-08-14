<script lang="ts">
	import ResponsiveLayout from '$lib/components/layout/ResponsiveLayout.svelte';
	import { AdvancedInteractiveChart, DataExplorer, SimulationBlock } from '$lib/components/index.js';
	import NeuralNetworkVisualizer from '$lib/components/NeuralNetworkVisualizer.svelte';
	import Quiz from '$lib/components/Quiz.svelte';
	import type { SimulationBlock as SimBlock } from '$lib/types/web-content.js';
	import type { DataFilter } from '$lib/types/web-content.js';

	// Enhanced dataset for machine learning exploration
	const mlDataset = [
		{ x: 1, y: 2.1, category: 'Class A', feature1: 0.2, feature2: 0.8, prediction: 0.85 },
		{ x: 2, y: 3.9, category: 'Class A', feature1: 0.4, feature2: 0.7, prediction: 0.92 },
		{ x: 3, y: 6.2, category: 'Class B', feature1: 0.6, feature2: 0.3, prediction: 0.78 },
		{ x: 4, y: 7.8, category: 'Class B', feature1: 0.8, feature2: 0.2, prediction: 0.88 },
		{ x: 5, y: 10.1, category: 'Class C', feature1: 0.9, feature2: 0.1, prediction: 0.95 },
		{ x: 6, y: 12.3, category: 'Class C', feature1: 0.7, feature2: 0.4, prediction: 0.82 },
		{ x: 7, y: 14.2, category: 'Class A', feature1: 0.3, feature2: 0.9, prediction: 0.76 },
		{ x: 8, y: 16.8, category: 'Class B', feature1: 0.5, feature2: 0.6, prediction: 0.89 },
		{ x: 9, y: 18.9, category: 'Class C', feature1: 0.8, feature2: 0.3, prediction: 0.91 },
		{ x: 10, y: 21.1, category: 'Class A', feature1: 0.4, feature2: 0.8, prediction: 0.87 }
	];

	const chartData = { 
		id: 'ml-chart', 
		type: 'line', 
		detected: true, 
		data: mlDataset.map((d) => ({ 
			x: d.x, 
			y: d.y, 
			label: `Point ${d.x}`,
			category: d.category,
			feature1: d.feature1,
			feature2: d.feature2,
			prediction: d.prediction
		}))
	};

	// Advanced filters for data exploration
	const dataFilters: DataFilter[] = [
		{
			field: 'y',
			type: 'number',
			operator: 'between',
			value: [0, 25],
			active: true
		},
		{
			field: 'category',
			type: 'text',
			operator: 'equals',
			value: 'Class A',
			active: false
		},
		{
			field: 'prediction',
			type: 'number',
			operator: 'greater',
			value: 0.8,
			active: false
		}
	];

	// Enhanced gradient descent simulation with visualization
	const gradientDescentBlock: SimBlock = {
		id: 'gradient-descent-2d',
		type: 'simulation',
		metadata: {
			created: new Date(),
			modified: new Date(),
			version: 1
		},
		content: {
			simulationType: 'Gradient Descent Optimization',
			parameters: [
				{ name: 'learning_rate', type: 'number', min: 0.001, max: 1, step: 0.01, default: 0.1, description: 'Learning rate (step size)' },
				{ name: 'momentum', type: 'number', min: 0, max: 0.99, step: 0.01, default: 0.0, description: 'Momentum factor' },
				{ name: 'initial_x', type: 'number', min: -5, max: 5, step: 0.1, default: 2.5, description: 'Starting X position' },
				{ name: 'initial_y', type: 'number', min: -5, max: 5, step: 0.1, default: 2.0, description: 'Starting Y position' }
			],
			initialState: { x: 2.5, y: 2.0, vx: 0, vy: 0, cost: 0, iteration: 0 },
			stepFunction: `
				// Optimize function f(x,y) = x^2 + y^2 (simple quadratic bowl)
				const gradX = 2 * state.x;
				const gradY = 2 * state.y;
				const lr = Number(parameters.learning_rate);
				const m = Number(parameters.momentum);
				
				const vxNew = m * state.vx - lr * gradX;
				const vyNew = m * state.vy - lr * gradY;
				const xNew = state.x + vxNew;
				const yNew = state.y + vyNew;
				const costNew = xNew * xNew + yNew * yNew;
				
				return { 
					x: xNew, 
					y: yNew, 
					vx: vxNew, 
					vy: vyNew, 
					cost: costNew,
					iteration: state.iteration + 1
				};
			`,
			visualization: { type: 'optimization', width: 600, height: 400, interactive: true, config: {} },
			sourceReference: {
				originalUrl: 'https://example.com/gradient-descent-optimization',
				originalContent: 'Interactive gradient descent visualization',
				transformationReasoning: 'Educational demonstration of optimization algorithms',
				extractionMethod: 'manual',
				confidence: 0.95
			}
		}
	};

	// K-means clustering simulation
	const kmeansBlock: SimBlock = {
		id: 'kmeans-clustering',
		type: 'simulation',
		metadata: {
			created: new Date(),
			modified: new Date(),
			version: 1
		},
		content: {
			simulationType: 'K-Means Clustering',
			parameters: [
				{ name: 'k', type: 'number', min: 2, max: 5, step: 1, default: 3, description: 'Number of clusters (K)' },
				{ name: 'max_iterations', type: 'number', min: 5, max: 50, step: 1, default: 20, description: 'Maximum iterations' },
				{ name: 'tolerance', type: 'number', min: 0.001, max: 0.1, step: 0.001, default: 0.01, description: 'Convergence tolerance' }
			],
			initialState: { 
				centroids: [[1, 1], [3, 3], [5, 5]], 
				assignments: [], 
				iteration: 0, 
				converged: false,
				inertia: 0
			},
			stepFunction: `
				// Simplified K-means step
				const k = Number(parameters.k);
				const tolerance = Number(parameters.tolerance);
				const maxIter = Number(parameters.max_iterations);
				
				// Sample data points (in real implementation, this would be dynamic)
				const dataPoints = [
					[1.2, 1.1], [1.8, 1.3], [2.1, 1.9],
					[3.2, 3.1], [3.8, 3.3], [4.1, 3.9],
					[5.2, 5.1], [5.8, 5.3], [6.1, 5.9]
				];
				
				// Assign points to nearest centroids
				const assignments = dataPoints.map(point => {
					let minDist = Infinity;
					let cluster = 0;
					state.centroids.forEach((centroid, i) => {
						const dist = Math.sqrt(
							Math.pow(point[0] - centroid[0], 2) + 
							Math.pow(point[1] - centroid[1], 2)
						);
						if (dist < minDist) {
							minDist = dist;
							cluster = i;
						}
					});
					return cluster;
				});
				
				// Update centroids
				const newCentroids = [];
				for (let i = 0; i < k; i++) {
					const clusterPoints = dataPoints.filter((_, idx) => assignments[idx] === i);
					if (clusterPoints.length > 0) {
						const centroidX = clusterPoints.reduce((sum, p) => sum + p[0], 0) / clusterPoints.length;
						const centroidY = clusterPoints.reduce((sum, p) => sum + p[1], 0) / clusterPoints.length;
						newCentroids.push([centroidX, centroidY]);
					} else {
						newCentroids.push(state.centroids[i]);
					}
				}
				
				// Check convergence
				const movement = state.centroids.reduce((sum, centroid, i) => {
					return sum + Math.sqrt(
						Math.pow(centroid[0] - newCentroids[i][0], 2) + 
						Math.pow(centroid[1] - newCentroids[i][1], 2)
					);
				}, 0);
				
				const converged = movement < tolerance || state.iteration >= maxIter;
				
				// Calculate inertia (within-cluster sum of squares)
				const inertia = dataPoints.reduce((sum, point, idx) => {
					const centroid = newCentroids[assignments[idx]];
					return sum + Math.pow(point[0] - centroid[0], 2) + Math.pow(point[1] - centroid[1], 2);
				}, 0);
				
				return {
					centroids: newCentroids,
					assignments,
					iteration: state.iteration + 1,
					converged,
					inertia: inertia.toFixed(2)
				};
			`,
			visualization: { type: 'clustering', width: 600, height: 400, interactive: true, config: {} },
			sourceReference: {
				originalUrl: 'https://example.com/kmeans-clustering',
				originalContent: 'K-means clustering algorithm demonstration',
				transformationReasoning: 'Interactive visualization of unsupervised learning',
				extractionMethod: 'manual',
				confidence: 0.92
			}
		}
	};

	// State for interactive elements
	let selectedVisualization = $state('neural-network');
	let currentQuizIndex = $state(0);
	let quizScores = $state<number[]>([]);

	// Quiz questions with immediate feedback
	const quizQuestions = [
		{
			id: 'activation-functions',
			question: 'Which activation function is linear across all inputs?',
			options: [
				{ label: 'ReLU (Rectified Linear Unit)', isCorrect: false },
				{ label: 'Sigmoid', isCorrect: false },
				{ label: 'Tanh (Hyperbolic Tangent)', isCorrect: false },
				{ label: 'Linear', isCorrect: true }
			],
			explanation: 'The Linear activation function outputs the input directly without any transformation, making it linear across all inputs. Other functions like ReLU, Sigmoid, and Tanh introduce non-linearities.'
		},
		{
			id: 'gradient-descent',
			question: 'What happens when the learning rate in gradient descent is too high?',
			options: [
				{ label: 'The algorithm converges faster', isCorrect: false },
				{ label: 'The algorithm may overshoot the minimum and fail to converge', isCorrect: true },
				{ label: 'The algorithm becomes more accurate', isCorrect: false },
				{ label: 'Nothing changes', isCorrect: false }
			],
			explanation: 'A learning rate that is too high can cause the algorithm to take steps that are too large, potentially overshooting the minimum and causing the algorithm to diverge or oscillate around the optimal solution.'
		},
		{
			id: 'clustering',
			question: 'In K-means clustering, what does the "K" represent?',
			options: [
				{ label: 'The number of features in the dataset', isCorrect: false },
				{ label: 'The number of data points', isCorrect: false },
				{ label: 'The number of clusters to create', isCorrect: true },
				{ label: 'The number of iterations', isCorrect: false }
			],
			explanation: 'In K-means clustering, "K" represents the number of clusters that the algorithm will create. This is a hyperparameter that must be specified before running the algorithm.'
		},
		{
			id: 'neural-networks',
			question: 'What is the primary purpose of hidden layers in a neural network?',
			options: [
				{ label: 'To store data', isCorrect: false },
				{ label: 'To learn complex non-linear patterns', isCorrect: true },
				{ label: 'To reduce computation time', isCorrect: false },
				{ label: 'To display results', isCorrect: false }
			],
			explanation: 'Hidden layers allow neural networks to learn complex non-linear patterns by combining and transforming features from the input layer through multiple levels of abstraction.'
		}
	];

	// Handle quiz completion
	function handleQuizComplete(score: number) {
		quizScores[currentQuizIndex] = score;
		if (currentQuizIndex < quizQuestions.length - 1) {
			currentQuizIndex++;
		}
	}

	// Calculate overall quiz performance
	const overallScore = $derived(() => {
		const completedQuizzes = quizScores.filter(score => score !== undefined);
		if (completedQuizzes.length === 0) return 0;
		return Math.round(completedQuizzes.reduce((sum, score) => sum + score, 0) / completedQuizzes.length);
	});
</script>

<ResponsiveLayout>
	<svelte:fragment slot="header">
		<h1>Interactive Guide: Machine Learning Fundamentals</h1>
		<p>Explore neural networks, data patterns, and algorithm dynamics with hands-on interactive visualizations and simulations.</p>
		<div class="progress-indicator">
			<span class="progress-label">Quiz Progress:</span>
			<div class="progress-bar">
				<div class="progress-fill" style="width: {(quizScores.filter(s => s !== undefined).length / quizQuestions.length) * 100}%"></div>
			</div>
			<span class="progress-text">{quizScores.filter(s => s !== undefined).length}/{quizQuestions.length} completed</span>
			{#if overallScore() > 0}
				<span class="score-badge" class:excellent={overallScore() >= 90} class:good={overallScore() >= 70} class:needs-improvement={overallScore() < 70}>
					Score: {overallScore()}%
				</span>
			{/if}
		</div>
	</svelte:fragment>

	<!-- Introduction Section -->
	<section class="intro-section">
		<h2>Welcome to Interactive Machine Learning</h2>
		<p>
			This comprehensive guide takes you through the fundamentals of machine learning with interactive visualizations, 
			hands-on simulations, and knowledge checks. You'll explore neural network architectures, experiment with real data, 
			and watch algorithms learn in real-time.
		</p>
		<div class="learning-objectives">
			<h3>Learning Objectives</h3>
			<ul>
				<li>Understand neural network architecture and activation functions</li>
				<li>Explore data patterns through interactive visualization</li>
				<li>Watch optimization algorithms converge step-by-step</li>
				<li>Experience unsupervised learning with clustering</li>
				<li>Test your knowledge with interactive quizzes</li>
			</ul>
		</div>
	</section>

	<!-- Neural Networks Section -->
	<section class="content-section">
		<h2>🧠 Neural Networks: Architecture and Activation</h2>
		<p>
			Neural networks are the foundation of deep learning. Experiment with different architectures by adjusting 
			the number of layers, neurons per layer, and activation functions. Notice how the network complexity changes 
			with your modifications.
		</p>
		
		<div class="interactive-container">
			<NeuralNetworkVisualizer 
				inputSize={4} 
				outputSize={3} 
				hiddenLayers={2}
				neuronsPerHidden={6}
				activation="relu"
			/>
		</div>

		<div class="explanation-box">
			<h4>Key Concepts:</h4>
			<ul>
				<li><strong>Input Layer:</strong> Receives the raw data features</li>
				<li><strong>Hidden Layers:</strong> Learn complex patterns through non-linear transformations</li>
				<li><strong>Output Layer:</strong> Produces the final predictions or classifications</li>
				<li><strong>Activation Functions:</strong> Introduce non-linearity, enabling the network to learn complex patterns</li>
			</ul>
		</div>
	</section>

	<!-- Data Exploration Section -->
	<section class="content-section">
		<h2>📊 Interactive Data Exploration</h2>
		<p>
			Data exploration is crucial in machine learning. Use the interactive chart below to filter, sort, and visualize 
			a sample dataset. Try different chart types and apply filters to discover patterns in the data.
		</p>

		<div class="interactive-container">
			<AdvancedInteractiveChart
				data={chartData}
				chartType="scatter"
				filters={dataFilters}
				config={{ 
					layout: { width: 800, height: 400, margin: { top: 40, right: 40, bottom: 60, left: 60 } },
					animations: { enabled: true }
				}}
				onHover={(payload) => console.log('Hovered:', payload)}
				onSelect={(payload) => console.log('Selected:', payload)}
			/>
		</div>

		<div class="data-explorer-container">
			<h4>Raw Data Explorer</h4>
			<DataExplorer data={mlDataset} title="Machine Learning Dataset" description="Explore the underlying data with sorting and filtering capabilities" />
		</div>

		<div class="explanation-box">
			<h4>Data Exploration Tips:</h4>
			<ul>
				<li><strong>Scatter Plot:</strong> Best for showing relationships between two continuous variables</li>
				<li><strong>Filtering:</strong> Use filters to focus on specific data subsets</li>
				<li><strong>Categories:</strong> Color coding helps identify different classes or groups</li>
				<li><strong>Outliers:</strong> Look for data points that don't fit the general pattern</li>
			</ul>
		</div>
	</section>

	<!-- Algorithm Simulations Section -->
	<section class="content-section">
		<h2>⚙️ Algorithm Simulations</h2>
		<p>
			Watch machine learning algorithms in action! These step-by-step simulations show how optimization 
			and clustering algorithms work internally.
		</p>

		<!-- Visualization Selector -->
		<div class="simulation-selector">
			<button 
				class="selector-btn" 
				class:active={selectedVisualization === 'gradient-descent'}
				onclick={() => selectedVisualization = 'gradient-descent'}
				type="button"
			>
				🎯 Gradient Descent
			</button>
			<button 
				class="selector-btn" 
				class:active={selectedVisualization === 'kmeans'}
				onclick={() => selectedVisualization = 'kmeans'}
				type="button"
			>
				🎪 K-Means Clustering
			</button>
		</div>

		{#if selectedVisualization === 'gradient-descent'}
			<div class="simulation-container">
				<h3>Gradient Descent Optimization</h3>
				<p>
					Watch how gradient descent finds the minimum of a function by following the steepest descent path. 
					Adjust the learning rate and momentum to see how they affect convergence.
				</p>
				<SimulationBlock block={gradientDescentBlock} editable={false} />
				<div class="algorithm-explanation">
					<h4>How Gradient Descent Works:</h4>
					<ol>
						<li>Start at a random point on the function surface</li>
						<li>Calculate the gradient (slope) at the current position</li>
						<li>Move in the opposite direction of the gradient</li>
						<li>Repeat until convergence (reaching the minimum)</li>
					</ol>
				</div>
			</div>
		{:else if selectedVisualization === 'kmeans'}
			<div class="simulation-container">
				<h3>K-Means Clustering</h3>
				<p>
					Observe how K-means clustering groups data points into clusters by iteratively updating 
					cluster centroids. Experiment with different values of K to see how it affects the clustering.
				</p>
				<SimulationBlock block={kmeansBlock} editable={false} />
				<div class="algorithm-explanation">
					<h4>K-Means Algorithm Steps:</h4>
					<ol>
						<li>Initialize K cluster centroids randomly</li>
						<li>Assign each data point to the nearest centroid</li>
						<li>Update centroids to the mean of assigned points</li>
						<li>Repeat steps 2-3 until centroids stop moving significantly</li>
					</ol>
				</div>
			</div>
		{/if}
	</section>

	<!-- Interactive Quiz Section -->
	<section class="content-section quiz-section">
		<h2>🧩 Knowledge Check</h2>
		<p>
			Test your understanding with these interactive quizzes. Each question provides immediate feedback 
			and explanations to reinforce your learning.
		</p>

		<div class="quiz-container">
			<div class="quiz-navigation">
				{#each quizQuestions as question, index (question.id)}
					<button 
						class="quiz-nav-btn" 
						class:active={currentQuizIndex === index}
						class:completed={quizScores[index] !== undefined}
						onclick={() => currentQuizIndex = index}
						type="button"
					>
						{index + 1}
						{#if quizScores[index] !== undefined}
							<span class="check-mark">✓</span>
						{/if}
					</button>
				{/each}
			</div>

			<div class="current-quiz">
				{#each [quizQuestions[currentQuizIndex]] as currentQuestion (currentQuestion.id)}
					<div class="quiz-header">
						<h3>Question {currentQuizIndex + 1} of {quizQuestions.length}</h3>
						<div class="quiz-topic">{currentQuestion.id.replace('-', ' ').toUpperCase()}</div>
					</div>

					<Quiz
						question={currentQuestion.question}
						options={currentQuestion.options}
						shuffle={true}
					/>

					{#if quizScores[currentQuizIndex] !== undefined}
						<div class="quiz-explanation">
							<h4>Explanation:</h4>
							<p>{currentQuestion.explanation}</p>
						</div>
					{/if}
				{/each}
			</div>

			{#if quizScores.filter(s => s !== undefined).length === quizQuestions.length}
				<div class="completion-message">
					<h3>🎉 Congratulations!</h3>
					<p>You've completed all the quizzes with an overall score of {overallScore()}%.</p>
					{#if overallScore() >= 90}
						<p class="excellence-message">Excellent work! You have a strong understanding of machine learning fundamentals.</p>
					{:else if overallScore() >= 70}
						<p class="good-message">Good job! You have a solid grasp of the concepts. Consider reviewing the areas where you scored lower.</p>
					{:else}
						<p class="improvement-message">Keep learning! Review the explanations and try the interactive elements again to strengthen your understanding.</p>
					{/if}
				</div>
			{/if}
		</div>
	</section>

	<!-- Summary Section -->
	<section class="content-section summary-section">
		<h2>🎯 Summary and Next Steps</h2>
		<p>
			You've explored the fundamentals of machine learning through interactive visualizations and hands-on simulations. 
			Here's what you've learned:
		</p>

		<div class="summary-grid">
			<div class="summary-card">
				<h4>🧠 Neural Networks</h4>
				<p>Architecture design, layer types, and activation functions that enable deep learning.</p>
			</div>
			<div class="summary-card">
				<h4>📊 Data Exploration</h4>
				<p>Interactive visualization techniques for understanding patterns and relationships in data.</p>
			</div>
			<div class="summary-card">
				<h4>⚙️ Optimization</h4>
				<p>How gradient descent finds optimal solutions through iterative parameter updates.</p>
			</div>
			<div class="summary-card">
				<h4>🎪 Clustering</h4>
				<p>Unsupervised learning techniques for discovering hidden patterns in data.</p>
			</div>
		</div>

		<div class="next-steps">
			<h4>Continue Your Learning Journey:</h4>
			<ul>
				<li>Experiment with different neural network architectures</li>
				<li>Try the simulations with various parameter settings</li>
				<li>Explore more advanced machine learning topics</li>
				<li>Apply these concepts to real-world datasets</li>
			</ul>
		</div>
	</section>
</ResponsiveLayout>

<style>
	/* Layout and Typography */
	.intro-section,
	.content-section {
		margin: 2rem 0;
		padding: 1.5rem;
		background: var(--bg-color, #ffffff);
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
		border: 1px solid var(--border-light, #e9ecef);
	}

	.content-section h2 {
		margin: 0 0 1rem 0;
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text-primary, #1a1a1a);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.content-section p {
		color: var(--text-secondary, #555);
		line-height: 1.6;
		margin-bottom: 1.5rem;
	}

	/* Progress Indicator */
	.progress-indicator {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 1rem;
		padding: 1rem;
		background: var(--bg-secondary, #f8f9fa);
		border-radius: 8px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.progress-label {
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.progress-bar {
		flex: 1;
		height: 8px;
		background: var(--progress-bg, #e9ecef);
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #0066cc, #28a745);
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.progress-text {
		font-size: 0.9rem;
		color: var(--text-secondary, #666);
	}

	.score-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.score-badge.excellent {
		background: #d4edda;
		color: #155724;
		border: 1px solid #c3e6cb;
	}

	.score-badge.good {
		background: #fff3cd;
		color: #856404;
		border: 1px solid #ffeaa7;
	}

	.score-badge.needs-improvement {
		background: #f8d7da;
		color: #721c24;
		border: 1px solid #f5c6cb;
	}

	/* Learning Objectives */
	.learning-objectives {
		background: var(--objectives-bg, #f0f8ff);
		border: 1px solid var(--objectives-border, #b3d9ff);
		border-radius: 8px;
		padding: 1.5rem;
		margin-top: 1.5rem;
	}

	.learning-objectives h3 {
		margin: 0 0 1rem 0;
		color: var(--text-primary, #1a1a1a);
		font-size: 1.2rem;
	}

	.learning-objectives ul {
		margin: 0;
		padding-left: 1.5rem;
	}

	.learning-objectives li {
		margin: 0.5rem 0;
		color: var(--text-primary, #1a1a1a);
		line-height: 1.5;
	}

	/* Interactive Containers */
	.interactive-container {
		background: var(--interactive-bg, #fafafa);
		border: 2px solid var(--interactive-border, #e1e5e9);
		border-radius: 12px;
		padding: 1.5rem;
		margin: 1.5rem 0;
	}

	.data-explorer-container {
		margin-top: 2rem;
		padding: 1.5rem;
		background: var(--explorer-bg, #f8f9fa);
		border-radius: 8px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.data-explorer-container h4 {
		margin: 0 0 1rem 0;
		color: var(--text-primary, #1a1a1a);
	}

	/* Explanation Boxes */
	.explanation-box,
	.algorithm-explanation {
		background: var(--explanation-bg, #e8f4fd);
		border: 1px solid var(--explanation-border, #b3d9ff);
		border-radius: 8px;
		padding: 1.5rem;
		margin-top: 1.5rem;
	}

	.explanation-box h4,
	.algorithm-explanation h4 {
		margin: 0 0 1rem 0;
		color: var(--text-primary, #1a1a1a);
		font-size: 1.1rem;
	}

	.explanation-box ul,
	.algorithm-explanation ol {
		margin: 0;
		padding-left: 1.5rem;
	}

	.explanation-box li,
	.algorithm-explanation li {
		margin: 0.5rem 0;
		color: var(--text-primary, #1a1a1a);
		line-height: 1.5;
	}

	/* Simulation Controls */
	.simulation-selector {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.selector-btn {
		background: var(--selector-bg, #ffffff);
		border: 2px solid var(--selector-border, #e1e5e9);
		border-radius: 8px;
		padding: 1rem 1.5rem;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.selector-btn:hover {
		border-color: var(--selector-hover-border, #0066cc);
		background: var(--selector-hover-bg, #f0f8ff);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 102, 204, 0.15);
	}

	.selector-btn.active {
		background: var(--selector-active-bg, #0066cc);
		color: var(--selector-active-text, #ffffff);
		border-color: var(--selector-active-border, #0066cc);
	}

	.simulation-container {
		background: var(--simulation-bg, #ffffff);
		border: 1px solid var(--border-light, #e9ecef);
		border-radius: 12px;
		padding: 2rem;
		margin-top: 1.5rem;
	}

	.simulation-container h3 {
		margin: 0 0 1rem 0;
		color: var(--text-primary, #1a1a1a);
		font-size: 1.5rem;
	}

	/* Quiz Section */
	.quiz-section {
		background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
		border: 2px solid var(--quiz-border, #dee2e6);
	}

	.quiz-container {
		background: var(--quiz-container-bg, #ffffff);
		border-radius: 12px;
		padding: 2rem;
		margin-top: 1.5rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	}

	.quiz-navigation {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 2rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.quiz-nav-btn {
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		border: 2px solid var(--quiz-nav-border, #e1e5e9);
		background: var(--quiz-nav-bg, #ffffff);
		color: var(--text-primary, #1a1a1a);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.quiz-nav-btn:hover {
		border-color: var(--quiz-nav-hover-border, #0066cc);
		background: var(--quiz-nav-hover-bg, #f0f8ff);
	}

	.quiz-nav-btn.active {
		background: var(--quiz-nav-active-bg, #0066cc);
		color: var(--quiz-nav-active-text, #ffffff);
		border-color: var(--quiz-nav-active-border, #0066cc);
	}

	.quiz-nav-btn.completed {
		background: var(--quiz-nav-completed-bg, #28a745);
		color: var(--quiz-nav-completed-text, #ffffff);
		border-color: var(--quiz-nav-completed-border, #28a745);
	}

	.check-mark {
		position: absolute;
		top: -4px;
		right: -4px;
		background: var(--check-mark-bg, #ffffff);
		color: var(--check-mark-color, #28a745);
		border-radius: 50%;
		width: 1.2rem;
		height: 1.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		font-weight: bold;
	}

	.quiz-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.quiz-header h3 {
		margin: 0 0 0.5rem 0;
		color: var(--text-primary, #1a1a1a);
	}

	.quiz-topic {
		background: var(--topic-bg, #e9ecef);
		color: var(--topic-text, #495057);
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.5px;
		display: inline-block;
	}

	.quiz-explanation {
		background: var(--explanation-bg, #e8f4fd);
		border: 1px solid var(--explanation-border, #b3d9ff);
		border-radius: 8px;
		padding: 1.5rem;
		margin-top: 1.5rem;
	}

	.quiz-explanation h4 {
		margin: 0 0 1rem 0;
		color: var(--text-primary, #1a1a1a);
	}

	.quiz-explanation p {
		margin: 0;
		color: var(--text-primary, #1a1a1a);
		line-height: 1.6;
	}

	/* Completion Message */
	.completion-message {
		background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
		border: 2px solid var(--completion-border, #28a745);
		border-radius: 12px;
		padding: 2rem;
		margin-top: 2rem;
		text-align: center;
	}

	.completion-message h3 {
		margin: 0 0 1rem 0;
		color: var(--completion-title, #155724);
		font-size: 1.5rem;
	}

	.completion-message p {
		margin: 0.5rem 0;
		color: var(--completion-text, #155724);
		font-size: 1.1rem;
	}

	.excellence-message {
		font-weight: 600;
		color: var(--excellence-color, #0f5132) !important;
	}

	.good-message {
		font-weight: 600;
		color: var(--good-color, #664d03) !important;
	}

	.improvement-message {
		font-weight: 600;
		color: var(--improvement-color, #842029) !important;
	}

	/* Summary Section */
	.summary-section {
		background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
		border: 2px solid var(--summary-border, #dee2e6);
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin: 2rem 0;
	}

	.summary-card {
		background: var(--card-bg, #ffffff);
		border: 1px solid var(--card-border, #e1e5e9);
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.summary-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.summary-card h4 {
		margin: 0 0 1rem 0;
		color: var(--text-primary, #1a1a1a);
		font-size: 1.2rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.summary-card p {
		margin: 0;
		color: var(--text-secondary, #666);
		line-height: 1.5;
	}

	.next-steps {
		background: var(--next-steps-bg, #fff3cd);
		border: 1px solid var(--next-steps-border, #ffeaa7);
		border-radius: 8px;
		padding: 1.5rem;
		margin-top: 2rem;
	}

	.next-steps h4 {
		margin: 0 0 1rem 0;
		color: var(--text-primary, #1a1a1a);
	}

	.next-steps ul {
		margin: 0;
		padding-left: 1.5rem;
	}

	.next-steps li {
		margin: 0.5rem 0;
		color: var(--text-primary, #1a1a1a);
		line-height: 1.5;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.intro-section,
		.content-section {
			padding: 1rem;
			margin: 1rem 0;
		}

		.content-section h2 {
			font-size: 1.5rem;
		}

		.progress-indicator {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}

		.simulation-selector {
			flex-direction: column;
			align-items: stretch;
		}

		.selector-btn {
			justify-content: center;
		}

		.quiz-navigation {
			gap: 0.25rem;
		}

		.quiz-nav-btn {
			width: 2.5rem;
			height: 2.5rem;
		}

		.summary-grid {
			grid-template-columns: 1fr;
		}

		.interactive-container,
		.simulation-container,
		.quiz-container {
			padding: 1rem;
		}
	}

	/* Dark Mode Support */
	@media (prefers-color-scheme: dark) {
		.intro-section,
		.content-section {
			background: var(--bg-dark, #1a1a1a);
			border-color: var(--border-dark, #333);
		}

		.learning-objectives {
			background: var(--objectives-bg-dark, #0d1117);
			border-color: var(--objectives-border-dark, #30363d);
		}

		.explanation-box,
		.algorithm-explanation,
		.quiz-explanation {
			background: var(--explanation-bg-dark, #0d1117);
			border-color: var(--explanation-border-dark, #30363d);
		}

		.summary-card {
			background: var(--card-bg-dark, #161b22);
			border-color: var(--card-border-dark, #30363d);
		}
	}
</style>
