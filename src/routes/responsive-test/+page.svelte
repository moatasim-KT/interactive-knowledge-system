<script lang="ts">
	import { ResponsiveContainer, Card, Button, MobileNavigation } from '$lib/components/ui';
	import { Grid } from '$lib/components/layout';

	let currentView = $state('dashboard');

	const navItems = $derived([
		{ id: 'dashboard', label: 'Dashboard', icon: '📊', active: currentView === 'dashboard' },
		{ id: 'content', label: 'Content', icon: '📚', active: currentView === 'content' },
		{ id: 'progress', label: 'Progress', icon: '📈', active: currentView === 'progress' },
		{ id: 'settings', label: 'Settings', icon: '⚙️', active: currentView === 'settings' }
	]);

	function handleNavigation(item: any) {
		currentView = item.id;
	}
</script>

<svelte:head>
	<title>Responsive Design Test</title>
</svelte:head>

<ResponsiveContainer maxWidth="full" padding="md">
	<div class="space-y-6">
		<header class="text-center">
			<h1 class="text-responsive-3xl font-bold text-text-primary mb-2">
				Responsive Design Test
			</h1>
			<p class="text-responsive-base text-text-secondary">
				Testing mobile compatibility and responsive design patterns
			</p>
		</header>

		<!-- Responsive Grid Test -->
		<section>
			<h2 class="text-responsive-xl font-semibold mb-4">Responsive Grid</h2>
			<Grid cols={{ mobile: 1, sm: 2, lg: 4 }} gap={{ mobile: 3, sm: 4, lg: 6 }}>
				{#each Array(8) as _, i}
					<Card variant="elevated" padding="md" class="text-center">
						<div class="text-2xl mb-2">📱</div>
						<h3 class="font-medium">Card {i + 1}</h3>
						<p class="text-sm text-text-secondary mt-2">
							This card adapts to different screen sizes
						</p>
					</Card>
				{/each}
			</Grid>
		</section>

		<!-- Auto-fit Grid Test -->
		<section>
			<h2 class="text-responsive-xl font-semibold mb-4">Auto-fit Grid</h2>
			<Grid autoFit minItemWidth="200px" gap={4}>
				{#each Array(6) as _, i}
					<Card variant="outlined" padding="sm" class="text-center">
						<div class="text-xl mb-1">🔧</div>
						<h4 class="font-medium text-sm">Auto Item {i + 1}</h4>
					</Card>
				{/each}
			</Grid>
		</section>

		<!-- Touch-friendly Buttons -->
		<section>
			<h2 class="text-responsive-xl font-semibold mb-4">Touch-friendly Elements</h2>
			<div class="space-responsive-md flex flex-wrap">
				<Button variant="primary" class="touch-target">Primary Action</Button>
				<Button variant="secondary" class="touch-target">Secondary</Button>
				<Button variant="outline" class="touch-target">Outline</Button>
				<Button variant="ghost" class="touch-target">Ghost</Button>
			</div>
		</section>

		<!-- Responsive Text -->
		<section>
			<h2 class="text-responsive-xl font-semibold mb-4">Responsive Typography</h2>
			<div class="space-y-3">
				<p class="text-responsive-4xl font-bold">Responsive 4XL</p>
				<p class="text-responsive-3xl font-bold">Responsive 3XL</p>
				<p class="text-responsive-2xl font-semibold">Responsive 2XL</p>
				<p class="text-responsive-xl font-medium">Responsive XL</p>
				<p class="text-responsive-lg">Responsive Large</p>
				<p class="text-responsive-base">Responsive Base</p>
				<p class="text-responsive-sm">Responsive Small</p>
			</div>
		</section>

		<!-- Mobile-specific Content -->
		<section class="mobile:bg-surface-secondary mobile:p-4 mobile:rounded-lg">
			<h2 class="text-responsive-xl font-semibold mb-4">Mobile-specific Styling</h2>
			<p class="text-responsive-base">
				This section has special styling that only applies on mobile devices.
				It demonstrates mobile-first responsive design principles.
			</p>
			
			<div class="mt-4 mobile:grid-cols-1 sm:grid-cols-2 grid gap-3">
				<Card padding="sm">
					<h3 class="font-medium mb-2">Mobile Optimized</h3>
					<p class="text-sm text-text-secondary">
						Content adapts to mobile screens with appropriate spacing and sizing.
					</p>
				</Card>
				<Card padding="sm">
					<h3 class="font-medium mb-2">Touch Friendly</h3>
					<p class="text-sm text-text-secondary">
						All interactive elements meet minimum touch target sizes.
					</p>
				</Card>
			</div>
		</section>

		<!-- Viewport Information -->
		<section>
			<h2 class="text-responsive-xl font-semibold mb-4">Viewport Information</h2>
			<Card variant="filled" padding="md">
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
					<div>
						<strong>Breakpoints:</strong>
						<ul class="mt-2 space-y-1 text-text-secondary">
							<li>Mobile: &lt; 640px</li>
							<li>Tablet: 640px - 1023px</li>
							<li>Desktop: ≥ 1024px</li>
						</ul>
					</div>
					<div>
						<strong>Features:</strong>
						<ul class="mt-2 space-y-1 text-text-secondary">
							<li>✅ Touch-friendly targets</li>
							<li>✅ Responsive typography</li>
							<li>✅ Mobile-first design</li>
							<li>✅ Safe area support</li>
						</ul>
					</div>
				</div>
			</Card>
		</section>
	</div>
</ResponsiveContainer>

<!-- Mobile Navigation Test -->
<MobileNavigation 
	items={navItems} 
	position="bottom" 
	variant="tabs"
	onnavigate={(item) => handleNavigation(item)}
/>

<style>
	/* Test page specific styles */
	.space-y-6 > * + * {
		margin-top: 1.5rem;
	}
	
	.space-y-3 > * + * {
		margin-top: 0.75rem;
	}
	
	.space-y-1 > * + * {
		margin-top: 0.25rem;
	}
	
	.space-responsive-md {
		gap: clamp(1rem, 3vw, 1.5rem);
	}
	
	.flex-wrap {
		flex-wrap: wrap;
	}
	
	.flex {
		display: flex;
	}
</style>