/**
 * Utility type definitions for common patterns and transformations
 * Provides advanced TypeScript utility types for the application
 */

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Deep readonly type
 */
export type DeepReadonly<T> = {
	readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Deep mutable type (opposite of DeepReadonly)
 */
export type DeepMutable<T> = {
	-readonly [P in keyof T]: T[P] extends object ? DeepMutable<T[P]> : T[P];
};

/**
 * Nullable type
 */
export type Nullable<T> = T | null;

/**
 * Optional type
 */
export type Optional<T> = T | undefined;

/**
 * Maybe type (nullable and optional)
 */
export type Maybe<T> = T | null | undefined;

/**
 * Non-nullable type
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Extract function parameters
 */
export type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any
	? P
	: never;

/**
 * Extract function return type
 */
export type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R
	? R
	: any;

/**
 * Extract promise type
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Create a type with all properties optional except specified ones
 */
export type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Create a type with all properties required except specified ones
 */
export type RequiredExcept<T, K extends keyof T> = Required<T> & Partial<Pick<T, K>>;

/**
 * Extract keys of a specific type
 */
export type KeysOfType<T, U> = {
	[K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Extract values of a specific type
 */
export type ValuesOfType<T, U> = T[KeysOfType<T, U>];

/**
 * Create a union of all property values
 */
export type ValueOf<T> = T[keyof T];

/**
 * Create a type that excludes functions
 */
export type NonFunctionKeys<T> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any ? never : K;
}[keyof T];

/**
 * Create a type that only includes functions
 */
export type FunctionKeys<T> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

/**
 * Create a type without function properties
 */
export type NonFunctionProperties<T> = Pick<T, NonFunctionKeys<T>>;

/**
 * Create a type with only function properties
 */
export type FunctionProperties<T> = Pick<T, FunctionKeys<T>>;

/**
 * Create a type that makes nested properties optional
 */
export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Create a type that makes nested properties required
 */
export type DeepRequired<T> = {
	[P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Flatten nested object types
 */
export type Flatten<T> = T extends object
	? {
			[K in keyof T]: T[K];
		}
	: T;

/**
 * Create a type that represents a path through an object
 */
export type Path<T, K extends keyof T = keyof T> = K extends string | number
	? T[K] extends object
		? K | `${K}.${Path<T[K]>}`
		: K
	: never;

/**
 * Get the type at a specific path
 */
export type PathValue<T, P extends Path<T>> = P extends `${infer K}.${infer Rest}`
	? K extends keyof T
		? Rest extends Path<T[K]>
			? PathValue<T[K], Rest>
			: never
		: never
	: P extends keyof T
		? T[P]
		: never;

/**
 * Create a branded type for type safety
 */
export type Brand<T, B> = T & { __brand: B };

/**
 * Extract the brand from a branded type
 */
export type UnBrand<T> = T extends Brand<infer U, any> ? U : T;

/**
 * Create a nominal type (similar to branded but more strict)
 */
export type Nominal<T, N extends string> = T & { readonly __nominal: N };

/**
 * Create a type that represents an ID
 */
export type ID<T extends string = string> = Brand<string, T>;

/**
 * Create a type for timestamps
 */
export type Timestamp = Brand<number, 'Timestamp'>;

/**
 * Create a type for URLs
 */
export type URL = Brand<string, 'URL'>;

/**
 * Create a type for email addresses
 */
export type Email = Brand<string, 'Email'>;

/**
 * Create a type for UUIDs
 */
export type UUID = Brand<string, 'UUID'>;

/**
 * Create a type for JSON strings
 */
export type JSONString = Brand<string, 'JSONString'>;

/**
 * Create a type for HTML strings
 */
export type HTMLString = Brand<string, 'HTMLString'>;

/**
 * Create a type for CSS strings
 */
export type CSSString = Brand<string, 'CSSString'>;

/**
 * Create a type that represents a constructor
 */
export type Constructor<T = Record<string, never>> = new (...args: any[]) => T;

/**
 * Create a type that represents an abstract constructor
 */
export type AbstractConstructor<T = Record<string, never>> = abstract new (...args: any[]) => T;

/**
 * Create a type that represents a mixin
 */
export type Mixin<T extends Constructor> = InstanceType<T>;

/**
 * Create a type for event listeners
 */
export type EventListener<T = Event> = (event: T) => void;

/**
 * Create a type for async event listeners
 */
export type AsyncEventListener<T = Event> = (event: T) => Promise<void>;

/**
 * Create a type for disposable resources
 */
export interface Disposable {
	dispose(): void;
}

/**
 * Create a type for async disposable resources
 */
export interface AsyncDisposable {
	dispose(): Promise<void>;
}

/**
 * Create a type for serializable objects
 */
export type Serializable =
	| string
	| number
	| boolean
	| null
	| undefined
	| Serializable[]
	| { [key: string]: Serializable };

/**
 * Create a type for JSON-serializable objects
 */
export type JSONSerializable =
	| string
	| number
	| boolean
	| null
	| JSONSerializable[]
	| { [key: string]: JSONSerializable };

/**
 * Create a type that represents a comparator function
 */
export type Comparator<T> = (a: T, b: T) => number;

/**
 * Create a type that represents a predicate function
 */
export type Predicate<T> = (value: T) => boolean;

/**
 * Create a type that represents a mapper function
 */
export type Mapper<T, U> = (value: T) => U;

/**
 * Create a type that represents a reducer function
 */
export type Reducer<T, U> = (accumulator: U, current: T) => U;

/**
 * Create a type that represents a key selector function
 */
export type KeySelector<T, K extends keyof any = keyof any> = (item: T) => K;

/**
 * Create a type for error handling
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Create a type for async results
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Create a type for option values
 */
export type Option<T> = T | null;

/**
 * Create a type for either values
 */
export type Either<L, R> = { type: 'left'; value: L } | { type: 'right'; value: R };

/**
 * Create a type for lazy values
 */
export type Lazy<T> = () => T;

/**
 * Create a type for async lazy values
 */
export type AsyncLazy<T> = () => Promise<T>;

/**
 * Create a type for cached values
 */
export interface Cached<T> {
	value: T;
	timestamp: number;
	ttl: number;
	isExpired(): boolean;
}

/**
 * Create a type for observable values
 */
export interface Observable<T> {
	subscribe(observer: (value: T) => void): () => void;
	getValue(): T;
}

/**
 * Create a type for reactive values
 */
export interface Reactive<T> {
	get(): T;
	set(value: T): void;
	update(updater: (current: T) => T): void;
	subscribe(callback: (value: T) => void): () => void;
}

/**
 * Create a type for computed values
 */
export interface Computed<T> {
	get(): T;
	subscribe(callback: (value: T) => void): () => void;
}

/**
 * Create a type for stores
 */
export interface Store<T> {
	subscribe(callback: (value: T) => void): () => void;
	set(value: T): void;
	update(updater: (current: T) => T): void;
}

/**
 * Create a type for readable stores
 */
export interface ReadableStore<T> {
	subscribe(callback: (value: T) => void): () => void;
}

/**
 * Create a type for writable stores
 */
export interface WritableStore<T> extends ReadableStore<T> {
	set(value: T): void;
	update(updater: (current: T) => T): void;
}

/**
 * Create a type for derived stores
 */
export interface DerivedStore<T> extends ReadableStore<T> {}

/**
 * Utility type to extract store value type
 */
export type StoreValue<T> = T extends Store<infer U> ? U : never;

/**
 * Create a type for theme values
 */
export type Theme = 'light' | 'dark' | 'auto';

/**
 * Create a type for breakpoints
 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Create a type for sizes
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Create a type for variants
 */
export type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

/**
 * Create a type for positions
 */
export type Position = 'top' | 'right' | 'bottom' | 'left' | 'center';

/**
 * Create a type for alignments
 */
export type Alignment = 'start' | 'center' | 'end' | 'stretch';

/**
 * Create a type for directions
 */
export type Direction = 'horizontal' | 'vertical';

/**
 * Create a type for orientations
 */
export type Orientation = 'portrait' | 'landscape';

/**
 * Create a type for loading states
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Create a type for async states
 */
export interface AsyncState<T, E = Error> {
	data: T | null;
	loading: boolean;
	error: E | null;
	lastFetch: Date | null;
}

/**
 * Create a type for pagination info
 */
export interface PaginationInfo {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
	hasNext: boolean;
	hasPrevious: boolean;
}

/**
 * Create a type for sort info
 */
export interface SortInfo<T = any> {
	field: keyof T;
	direction: 'asc' | 'desc';
}

/**
 * Create a type for filter info
 */
export interface FilterInfo {
	field: string;
	operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
	value: any;
}

/**
 * Create a type for search info
 */
export interface SearchInfo {
	query: string;
	fields: string[];
	options: {
		caseSensitive?: boolean;
		wholeWord?: boolean;
		regex?: boolean;
	};
}
