
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
		RouteId(): "/" | "/accessibility-test" | "/articles" | "/articles/machine-learning" | "/content-sources" | "/enhanced-dashboard" | "/interactive-article-demo" | "/knowledge-test" | "/knowledge" | "/knowledge/[id]" | "/responsive-test" | "/visualizations";
		RouteParams(): {
			"/knowledge/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string };
			"/accessibility-test": Record<string, never>;
			"/articles": Record<string, never>;
			"/articles/machine-learning": Record<string, never>;
			"/content-sources": Record<string, never>;
			"/enhanced-dashboard": Record<string, never>;
			"/interactive-article-demo": Record<string, never>;
			"/knowledge-test": Record<string, never>;
			"/knowledge": { id?: string };
			"/knowledge/[id]": { id: string };
			"/responsive-test": Record<string, never>;
			"/visualizations": Record<string, never>
		};
		Pathname(): "/" | "/accessibility-test" | "/articles" | "/articles/machine-learning" | "/content-sources" | "/enhanced-dashboard" | "/interactive-article-demo" | "/knowledge-test" | "/knowledge" | `/knowledge/${string}` & {} | "/responsive-test" | "/visualizations";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.svg";
	}
}