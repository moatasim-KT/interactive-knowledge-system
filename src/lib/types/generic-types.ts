/**
 * Generic type definitions for reusable components and utilities
 * Provides type-safe patterns for common component patterns
 */

import type { Snippet } from 'svelte';

/**
 * Generic component props with common patterns
 */
export interface BaseComponentProps {
	class?: string;
	id?: string;
	'data-testid'?: string;
	style?: string;
	hidden?: boolean;
	disabled?: boolean;
}

/**
 * Generic props for components that can be controlled or uncontrolled
 */
export interface ControllableProps<T> {
	value?: T;
	defaultValue?: T;
	onChange?: (value: T) => void;
}

/**
 * Generic props for components with loading states
 */
export interface LoadableProps {
	loading?: boolean;
	loadingText?: string;
	loadingComponent?: Snippet;
	error?: string | Error | null;
	errorComponent?: Snippet<[Error]>;
}

/**
 * Generic props for components with async operations
 */
export interface AsyncProps<T = any> extends LoadableProps {
	onSuccess?: (result: T) => void;
	onError?: (error: Error) => void;
	onStart?: () => void;
	onComplete?: () => void;
}

/**
 * Generic props for paginated components
 */
export interface PaginatedProps<T = any> {
	items: T[];
	pageSize?: number;
	currentPage?: number;
	totalItems?: number;
	onPageChange?: (page: number) => void;
	onPageSizeChange?: (pageSize: number) => void;
	showPagination?: boolean;
	paginationPosition?: 'top' | 'bottom' | 'both';
}

/**
 * Generic props for sortable components
 */
export interface SortableProps<T = any> {
	sortBy?: keyof T;
	sortDirection?: 'asc' | 'desc';
	onSort?: (field: keyof T, direction: 'asc' | 'desc') => void;
	sortable?: boolean;
	sortableFields?: (keyof T)[];
}

/**
 * Generic props for filterable components
 */
export interface FilterableProps<T = any> {
	filters?: Record<string, any>;
	onFilterChange?: (filters: Record<string, any>) => void;
	filterable?: boolean;
	filterableFields?: (keyof T)[];
	showFilterControls?: boolean;
}

/**
 * Generic props for searchable components
 */
export interface SearchableProps<T = any> {
	searchQuery?: string;
	onSearch?: (query: string) => void;
	searchable?: boolean;
	searchFields?: (keyof T)[];
	searchPlaceholder?: string;
	showSearchControls?: boolean;
}

/**
 * Generic props for selectable components
 */
export interface SelectableProps<T = any> {
	selected?: T | T[];
	onSelect?: (item: T) => void;
	onSelectionChange?: (selected: T[]) => void;
	selectable?: boolean;
	multiSelect?: boolean;
	selectAll?: boolean;
}

/**
 * Generic props for draggable/droppable components
 */
export interface DraggableProps<T = any> {
	draggable?: boolean;
	droppable?: boolean;
	onDragStart?: (item: T, event: DragEvent) => void;
	onDragEnd?: (item: T, event: DragEvent) => void;
	onDrop?: (item: T, target: T, event: DragEvent) => void;
	onReorder?: (items: T[]) => void;
	dragHandle?: string; // CSS selector
}

/**
 * Generic props for virtualized components
 */
export interface VirtualizedProps<T = any> {
	items: T[];
	itemHeight: number | ((item: T, index: number) => number);
	containerHeight: number;
	overscan?: number;
	onScroll?: (scrollTop: number) => void;
	renderItem: (item: T, index: number) => Snippet;
}

/**
 * Generic props for form components
 */
export interface FormComponentProps<T = any> extends BaseComponentProps, ControllableProps<T> {
	name?: string;
	required?: boolean;
	readonly?: boolean;
	placeholder?: string;
	label?: string;
	description?: string;
	error?: string;
	touched?: boolean;
	onBlur?: (event: FocusEvent) => void;
	onFocus?: (event: FocusEvent) => void;
}

/**
 * Generic validation result
 */
export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings?: string[];
}

/**
 * Generic validator function
 */
export type Validator<T = any> = (value: T) => ValidationResult | Promise<ValidationResult>;

/**
 * Generic props for validated components
 */
export interface ValidatedProps<T = any> extends FormComponentProps<T> {
	validators?: Validator<T>[];
	validateOn?: 'change' | 'blur' | 'submit';
	showValidation?: boolean;
	onValidation?: (result: ValidationResult) => void;
}

/**
 * Generic data table column definition
 */
export interface TableColumn<T = any> {
	key: keyof T;
	label: string;
	sortable?: boolean;
	filterable?: boolean;
	width?: string | number;
	minWidth?: string | number;
	maxWidth?: string | number;
	align?: 'left' | 'center' | 'right';
	render?: (value: T[keyof T], item: T, index: number) => Snippet;
	headerRender?: () => Snippet;
	footerRender?: (items: T[]) => Snippet;
}

/**
 * Generic data table props
 */
export interface DataTableProps<T = any>
	extends BaseComponentProps,
		PaginatedProps<T>,
		SortableProps<T>,
		FilterableProps<T>,
		SearchableProps<T>,
		SelectableProps<T> {
	columns: TableColumn<T>[];
	data: T[];
	keyField?: keyof T;
	striped?: boolean;
	bordered?: boolean;
	hover?: boolean;
	compact?: boolean;
	responsive?: boolean;
	emptyMessage?: string;
	emptyComponent?: Snippet;
	headerComponent?: Snippet;
	footerComponent?: Snippet;
	rowComponent?: Snippet<[T, number]>;
}

/**
 * Generic modal props
 */
export interface ModalProps extends BaseComponentProps {
	open: boolean;
	onClose?: () => void;
	onOpen?: () => void;
	title?: string;
	size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
	closable?: boolean;
	closeOnEscape?: boolean;
	closeOnBackdrop?: boolean;
	showHeader?: boolean;
	showFooter?: boolean;
	headerComponent?: Snippet;
	footerComponent?: Snippet;
	children: Snippet;
}

/**
 * Generic dropdown/select props
 */
export interface DropdownProps<T = any> extends FormComponentProps<T> {
	options: DropdownOption<T>[];
	multiple?: boolean;
	searchable?: boolean;
	clearable?: boolean;
	creatable?: boolean;
	loading?: boolean;
	loadingText?: string;
	noOptionsText?: string;
	maxHeight?: string | number;
	optionRender?: (option: DropdownOption<T>) => Snippet;
	valueRender?: (value: T) => Snippet;
}

/**
 * Generic dropdown option
 */
export interface DropdownOption<T = any> {
	value: T;
	label: string;
	disabled?: boolean;
	group?: string;
	data?: Record<string, any>;
}

/**
 * Generic tree node
 */
export interface TreeNode<T = any> {
	id: string;
	label: string;
	data?: T;
	children?: TreeNode<T>[];
	parent?: string;
	expanded?: boolean;
	selected?: boolean;
	disabled?: boolean;
	icon?: string;
	level?: number;
}

/**
 * Generic tree component props
 */
export interface TreeProps<T = any> extends BaseComponentProps, SelectableProps<TreeNode<T>> {
	nodes: TreeNode<T>[];
	expandable?: boolean;
	checkable?: boolean;
	draggable?: boolean;
	showIcons?: boolean;
	showLines?: boolean;
	defaultExpanded?: string[];
	onExpand?: (nodeId: string, expanded: boolean) => void;
	onCheck?: (nodeId: string, checked: boolean) => void;
	nodeRender?: (node: TreeNode<T>) => Snippet;
	iconRender?: (node: TreeNode<T>) => Snippet;
}

/**
 * Generic chart props
 */
export interface ChartProps<T = any> extends BaseComponentProps {
	data: T[];
	width?: number;
	height?: number;
	responsive?: boolean;
	animated?: boolean;
	theme?: 'light' | 'dark';
	colors?: string[];
	margin?: {
		top: number;
		right: number;
		bottom: number;
		left: number;
	};
	onDataPointClick?: (point: T, index: number) => void;
	onDataPointHover?: (point: T, index: number) => void;
	tooltip?: boolean;
	legend?: boolean;
	grid?: boolean;
	axes?: boolean;
}

/**
 * Generic notification/toast props
 */
export interface NotificationProps extends BaseComponentProps {
	type: 'info' | 'success' | 'warning' | 'error';
	title?: string;
	message: string;
	duration?: number;
	persistent?: boolean;
	closable?: boolean;
	position?:
		| 'top-left'
		| 'top-right'
		| 'bottom-left'
		| 'bottom-right'
		| 'top-center'
		| 'bottom-center';
	onClose?: () => void;
	action?: {
		label: string;
		handler: () => void;
	};
}

/**
 * Generic progress indicator props
 */
export interface ProgressProps extends BaseComponentProps {
	value: number;
	max?: number;
	min?: number;
	variant?: 'linear' | 'circular';
	size?: 'sm' | 'md' | 'lg';
	color?: string;
	showValue?: boolean;
	showPercentage?: boolean;
	animated?: boolean;
	striped?: boolean;
	label?: string;
}

/**
 * Generic skeleton loader props
 */
export interface SkeletonProps extends BaseComponentProps {
	variant?: 'text' | 'rectangular' | 'circular';
	width?: string | number;
	height?: string | number;
	lines?: number;
	animated?: boolean;
}

/**
 * Generic infinite scroll props
 */
export interface InfiniteScrollProps<T = any> extends BaseComponentProps {
	items: T[];
	hasMore: boolean;
	loading: boolean;
	onLoadMore: () => void;
	threshold?: number;
	loader?: Snippet;
	endMessage?: Snippet;
	itemRender: (item: T, index: number) => Snippet;
}

/**
 * Generic utility types
 */
export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
	[P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

export type Prettify<T> = {
	[K in keyof T]: T[K];
} & Record<string, never>;

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
	k: infer I
) => void
	? I
	: never;

export type PickByType<T, U> = {
	[K in keyof T as T[K] extends U ? K : never]: T[K];
};

export type OmitByType<T, U> = {
	[K in keyof T as T[K] extends U ? never : K]: T[K];
};

/**
 * Generic async state
 */
export interface AsyncState<T = any, E = Error> {
	data: T | null;
	loading: boolean;
	error: E | null;
	lastFetch: Date | null;
}

/**
 * Generic resource state
 */
export interface ResourceState<T = any> extends AsyncState<T> {
	refetch: () => Promise<void>;
	mutate: (data: T) => void;
	invalidate: () => void;
}

/**
 * Generic cache configuration
 */
export interface CacheConfig {
	ttl?: number; // Time to live in milliseconds
	maxSize?: number;
	strategy?: 'lru' | 'fifo' | 'lfu';
}

/**
 * Generic debounced function
 */
export interface DebouncedFunction<T extends (...args: any[]) => any> {
	(...args: Parameters<T>): void;
	cancel: () => void;
	flush: () => ReturnType<T> | undefined;
}

/**
 * Generic throttled function
 */
export interface ThrottledFunction<T extends (...args: any[]) => any> {
	(...args: Parameters<T>): ReturnType<T> | undefined;
	cancel: () => void;
}
