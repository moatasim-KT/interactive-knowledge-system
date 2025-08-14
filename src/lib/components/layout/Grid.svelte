<script lang="ts">
	interface Props {
		cols?: number | { mobile?: number; sm?: number; md?: number; lg?: number; xl?: number };
		gap?: number | string | { mobile?: number; sm?: number; md?: number; lg?: number };
		class?: string;
		autoFit?: boolean;
		minItemWidth?: string;
		children?: any;
	}

	let { 
		cols = 1, 
		gap = 4, 
		class: className = '', 
		autoFit = false,
		minItemWidth = '250px',
		children 
	}: Props = $props();

	let grid_classes = $derived(() => {
		const classes = ['grid'];

		// Handle auto-fit grid
		if (autoFit) {
			classes.push('grid-auto-fit');
		} else {
			// Handle responsive columns
			if (typeof cols === 'number') {
				classes.push(`grid-cols-${cols}`);
			} else {
				// Mobile-first approach
				if (cols.mobile) classes.push(`mobile:grid-cols-${cols.mobile}`);
				if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
				if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
				if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
				if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
			}
		}

		// Handle responsive gaps
		if (typeof gap === 'number') {
			classes.push(`gap-${gap}`);
		} else if (typeof gap === 'string') {
			classes.push(`gap-[${gap}]`);
		} else if (typeof gap === 'object') {
			if (gap.mobile) classes.push(`mobile:gap-${gap.mobile}`);
			if (gap.sm) classes.push(`sm:gap-${gap.sm}`);
			if (gap.md) classes.push(`md:gap-${gap.md}`);
			if (gap.lg) classes.push(`lg:gap-${gap.lg}`);
		}

		if (className) classes.push(className);

		return classes.join(' ');
	});

	let grid_style = $derived(() => {
		if (autoFit) {
			return `grid-template-columns: repeat(auto-fit, minmax(${minItemWidth}, 1fr));`;
		}
		return '';
	});

	// Convert derived to string for style attribute
	let computed_style = $derived(grid_style());
</script>

<div class={grid_classes} style={computed_style}>
	{@render children?.()}
</div>

<style>
	/* Grid column utilities */
	:global(.grid-cols-1) {
		grid-template-columns: repeat(1, minmax(0, 1fr));
	}
	:global(.grid-cols-2) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	:global(.grid-cols-3) {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	:global(.grid-cols-4) {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}
	:global(.grid-cols-5) {
		grid-template-columns: repeat(5, minmax(0, 1fr));
	}
	:global(.grid-cols-6) {
		grid-template-columns: repeat(6, minmax(0, 1fr));
	}
	:global(.grid-cols-12) {
		grid-template-columns: repeat(12, minmax(0, 1fr));
	}

	/* Gap utilities */
	:global(.gap-1) {
		gap: 0.25rem;
	}
	:global(.gap-2) {
		gap: 0.5rem;
	}
	:global(.gap-3) {
		gap: 0.75rem;
	}
	:global(.gap-4) {
		gap: 1rem;
	}
	:global(.gap-5) {
		gap: 1.25rem;
	}
	:global(.gap-6) {
		gap: 1.5rem;
	}
	:global(.gap-8) {
		gap: 2rem;
	}

	/* Auto-fit grid */
	:global(.grid-auto-fit) {
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	}

	/* Mobile grid columns */
	@media (max-width: 639px) {
		:global(.mobile\:grid-cols-1) {
			grid-template-columns: repeat(1, minmax(0, 1fr));
		}
		:global(.mobile\:grid-cols-2) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		:global(.mobile\:gap-2) {
			gap: 0.5rem;
		}
		:global(.mobile\:gap-3) {
			gap: 0.75rem;
		}
		:global(.mobile\:gap-4) {
			gap: 1rem;
		}
	}

	/* Responsive grid columns */
	@media (min-width: 640px) {
		:global(.sm\:grid-cols-1) {
			grid-template-columns: repeat(1, minmax(0, 1fr));
		}
		:global(.sm\:grid-cols-2) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		:global(.sm\:grid-cols-3) {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		:global(.sm\:grid-cols-4) {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
		:global(.sm\:grid-cols-6) {
			grid-template-columns: repeat(6, minmax(0, 1fr));
		}
	}

	@media (min-width: 768px) {
		:global(.md\:grid-cols-1) {
			grid-template-columns: repeat(1, minmax(0, 1fr));
		}
		:global(.md\:grid-cols-2) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		:global(.md\:grid-cols-3) {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		:global(.md\:grid-cols-4) {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
		:global(.md\:grid-cols-6) {
			grid-template-columns: repeat(6, minmax(0, 1fr));
		}
	}

	@media (min-width: 1024px) {
		:global(.lg\:grid-cols-1) {
			grid-template-columns: repeat(1, minmax(0, 1fr));
		}
		:global(.lg\:grid-cols-2) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		:global(.lg\:grid-cols-3) {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		:global(.lg\:grid-cols-4) {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
		:global(.lg\:grid-cols-6) {
			grid-template-columns: repeat(6, minmax(0, 1fr));
		}
	}

	@media (min-width: 1280px) {
		:global(.xl\:grid-cols-1) {
			grid-template-columns: repeat(1, minmax(0, 1fr));
		}
		:global(.xl\:grid-cols-2) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		:global(.xl\:grid-cols-3) {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		:global(.xl\:grid-cols-4) {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
		:global(.xl\:grid-cols-6) {
			grid-template-columns: repeat(6, minmax(0, 1fr));
		}
	}
</style>
