<script lang="ts">
	type Props = {
		columns?: {
			mobile?: number;
			tablet?: number;
			desktop?: number;
		};
		gap?: 'sm' | 'md' | 'lg' | 'xl';
		minItemWidth?: string;
		class?: string;
		children?: any;
	}

	let {
		columns = { mobile: 1, tablet: 2, desktop: 3 },
		gap = 'md',
		minItemWidth = '300px',
		class: className = '',
		children
	}: Props = $props();

	const gapClasses = {
		sm: 'gap-2',
		md: 'gap-4',
		lg: 'gap-6',
		xl: 'gap-8'
	};

	const gridClasses = $derived(() =>
		[
			'responsive-grid',
			gapClasses[gap],
			className
		]
			.filter(Boolean)
			.join(' ')
	);

	const gridStyle = $derived(() => {
		if (minItemWidth) {
			return `grid-template-columns: repeat(auto-fill, minmax(${minItemWidth}, 1fr));`;
		}
		return '';
	});
</script>

<div 
	class={gridClasses} 
	style={gridStyle}
	data-columns-mobile={columns.mobile}
	data-columns-tablet={columns.tablet}
	data-columns-desktop={columns.desktop}
>
	{@render children?.()}
</div>

<style>
	.responsive-grid {
		display: grid;
		width: 100%;
	}

	/* Gap utilities */
	.gap-2 {
		gap: 0.5rem;
	}
	.gap-4 {
		gap: 1rem;
	}
	.gap-6 {
		gap: 1.5rem;
	}
	.gap-8 {
		gap: 2rem;
	}

	/* Responsive column overrides when not using minItemWidth */
	@media (max-width: 640px) {
		.responsive-grid:not([style*="grid-template-columns"]) {
			grid-template-columns: repeat(var(--mobile-columns, 1), 1fr);
		}
	}

	@media (min-width: 641px) and (max-width: 1024px) {
		.responsive-grid:not([style*="grid-template-columns"]) {
			grid-template-columns: repeat(var(--tablet-columns, 2), 1fr);
		}
	}

	@media (min-width: 1025px) {
		.responsive-grid:not([style*="grid-template-columns"]) {
			grid-template-columns: repeat(var(--desktop-columns, 3), 1fr);
		}
	}

	/* Set CSS custom properties based on data attributes */
	.responsive-grid[data-columns-mobile] {
		--mobile-columns: attr(data-columns-mobile);
	}
	.responsive-grid[data-columns-tablet] {
		--tablet-columns: attr(data-columns-tablet);
	}
	.responsive-grid[data-columns-desktop] {
		--desktop-columns: attr(data-columns-desktop);
	}
</style>