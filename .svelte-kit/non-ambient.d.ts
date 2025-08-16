
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/articles" | "/articles/machine-learning" | "/content-sources" | "/enhanced-dashboard" | "/knowledge" | "/knowledge/[id]" | "/visualizations";
		RouteParams(): {
			"/knowledge/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string };
			"/articles": Record<string, never>;
			"/articles/machine-learning": Record<string, never>;
			"/content-sources": Record<string, never>;
			"/enhanced-dashboard": Record<string, never>;
			"/knowledge": { id?: string };
			"/knowledge/[id]": { id: string };
			"/visualizations": Record<string, never>
		};
		Pathname(): "/" | "/articles" | "/articles/machine-learning" | "/content-sources" | "/enhanced-dashboard" | "/knowledge" | `/knowledge/${string}` & {} | "/visualizations";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.svg";
	}
}