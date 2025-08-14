type DynamicRoutes = {
	"/knowledge/[id]": { id: string }
};

type Layouts = {
	"/": { id?: string };
	"/accessibility-test": undefined;
	"/articles": undefined;
	"/articles/machine-learning": undefined;
	"/knowledge-test": undefined;
	"/knowledge": { id?: string };
	"/knowledge/[id]": { id: string };
	"/responsive-test": undefined
};

export type RouteId = "/" | "/accessibility-test" | "/articles" | "/articles/machine-learning" | "/knowledge-test" | "/knowledge" | "/knowledge/[id]" | "/responsive-test";

export type RouteParams<T extends RouteId> = T extends keyof DynamicRoutes ? DynamicRoutes[T] : Record<string, never>;

export type LayoutParams<T extends RouteId> = Layouts[T] | Record<string, never>;

export type Pathname = "/" | "/accessibility-test" | "/articles" | "/articles/machine-learning" | "/knowledge-test" | "/knowledge" | `/knowledge/${string}` & {} | "/responsive-test";

export type ResolvedPathname = `${"" | `/${string}`}${Pathname}`;

export type Asset = "/favicon.svg";