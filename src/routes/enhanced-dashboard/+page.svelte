<script lang="ts">
	import { EnhancedWebContentDashboard } from '$lib/components/index.ts';

	let pageTitle = 'Enhanced Dashboard Demo';

	$effect(() => {
		document.title = pageTitle;
	});
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content="Demo of the enhanced responsive web content dashboard with advanced filtering, search, and mobile optimization." />
</svelte:head>

<div class="demo-page">
	<div class="demo-header">
		<h1>Enhanced Dashboard Demo</h1>
		<p>Experience the new responsive dashboard with advanced filtering, search capabilities, and mobile-optimized interactions.</p>
		
		<div class="feature-highlights">
			<div class="feature">
				<span class="feature-icon">📱</span>
				<span class="feature-text">Mobile Responsive</span>
			</div>
			<div class="feature">
				<span class="feature-icon">🔍</span>
				<span class="feature-text">Advanced Search</span>
			</div>
			<div class="feature">
				<span class="feature-icon">⚡</span>
				<span class="feature-text">Real-time Progress</span>
			</div>
			<div class="feature">
				<span class="feature-icon">🎨</span>
				<span class="feature-text">Clean Design</span>
			</div>
		</div>
	</div>

	<EnhancedWebContentDashboard />
</div>

<style>
	.demo-page {
		min-height: 100vh;
		background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
	}

	.demo-header {
		background: white;
		padding: 2rem;
		margin-bottom: 2rem;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
		text-align: center;
	}

	.demo-header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 1rem 0;
		color: #333;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.demo-header p {
		font-size: 1.1rem;
		color: #666;
		margin: 0 0 2rem 0;
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;
		line-height: 1.6;
	}

	.feature-highlights {
		display: flex;
		justify-content: center;
		gap: 2rem;
		flex-wrap: wrap;
	}

	.feature {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border-radius: 2rem;
		font-weight: 500;
		box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
		transition: transform 0.2s ease;
	}

	.feature:hover {
		transform: translateY(-2px);
	}

	.feature-icon {
		font-size: 1.2rem;
	}

	.feature-text {
		font-size: 0.9rem;
	}

	@media (max-width: 768px) {
		.demo-header {
			padding: 1.5rem 1rem;
		}

		.demo-header h1 {
			font-size: 2rem;
		}

		.demo-header p {
			font-size: 1rem;
		}

		.feature-highlights {
			gap: 1rem;
		}

		.feature {
			padding: 0.5rem 1rem;
		}

		.feature-text {
			font-size: 0.8rem;
		}
	}

	@media (max-width: 480px) {
		.feature-highlights {
			flex-direction: column;
			align-items: center;
		}

		.feature {
			width: 100%;
			max-width: 200px;
			justify-content: center;
		}
	}
</style>