type DynamicRoutes = {
	"/knowledge/[id]": { id: string }
};

type Layouts = {
	"/": { id?: string };
	"/code-demo": undefined;
	"/demo-interactive-viz": undefined;
	"/knowledge": { id?: string };
	"/knowledge/[id]": { id: string };
	"/progress-demo": undefined;
	"/relationships-demo": undefined;
	"/simulation-demo": undefined
};

export type RouteId = "/" | "/code-demo" | "/demo-interactive-viz" | "/knowledge" | "/knowledge/[id]" | "/progress-demo" | "/relationships-demo" | "/simulation-demo";

export type RouteParams<T extends RouteId> = T extends keyof DynamicRoutes ? DynamicRoutes[T] : Record<string, never>;

export type LayoutParams<T extends RouteId> = Layouts[T] | Record<string, never>;

export type Pathname = "/" | "/code-demo" | "/demo-interactive-viz" | "/knowledge" | `/knowledge/${string}` & {} | "/progress-demo" | "/relationships-demo" | "/simulation-demo";

export type ResolvedPathname = `${"" | `/${string}`}${Pathname}`;

export type Asset = never;