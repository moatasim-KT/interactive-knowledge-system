/**
 * Comprehensive validation type definitions
 * Provides type-safe validation patterns for forms and data
 */

/**
 * Validation rule types
 */
export type ValidationRuleType =
	| 'required'
	| 'minLength'
	| 'maxLength'
	| 'min'
	| 'max'
	| 'pattern'
	| 'email'
	| 'url'
	| 'number'
	| 'integer'
	| 'boolean'
	| 'date'
	| 'custom';

/**
 * Base validation rule interface
 */
export interface BaseValidationRule {
	type: ValidationRuleType;
	message?: string;
	when?: (value: any, data: any) => boolean;
}

/**
 * Required validation rule
 */
export interface RequiredRule extends BaseValidationRule {
	type: 'required';
	allowEmpty?: boolean;
}

/**
 * String length validation rules
 */
export interface MinLengthRule extends BaseValidationRule {
	type: 'minLength';
	value: number;
}

export interface MaxLengthRule extends BaseValidationRule {
	type: 'maxLength';
	value: number;
}

/**
 * Numeric validation rules
 */
export interface MinRule extends BaseValidationRule {
	type: 'min';
	value: number;
	inclusive?: boolean;
}

export interface MaxRule extends BaseValidationRule {
	type: 'max';
	value: number;
	inclusive?: boolean;
}

/**
 * Pattern validation rule
 */
export interface PatternRule extends BaseValidationRule {
	type: 'pattern';
	value: RegExp | string;
	flags?: string;
}

/**
 * Email validation rule
 */
export interface EmailRule extends BaseValidationRule {
	type: 'email';
	allowDisplayName?: boolean;
	requireTld?: boolean;
}

/**
 * URL validation rule
 */
export interface UrlRule extends BaseValidationRule {
	type: 'url';
	protocols?: string[];
	requireProtocol?: boolean;
	allowDataUrl?: boolean;
}

/**
 * Number validation rule
 */
export interface NumberRule extends BaseValidationRule {
	type: 'number';
	allowNaN?: boolean;
	allowInfinity?: boolean;
}

/**
 * Integer validation rule
 */
export interface IntegerRule extends BaseValidationRule {
	type: 'integer';
	allowNegative?: boolean;
}

/**
 * Boolean validation rule
 */
export interface BooleanRule extends BaseValidationRule {
	type: 'boolean';
	strict?: boolean;
}

/**
 * Date validation rule
 */
export interface DateRule extends BaseValidationRule {
	type: 'date';
	format?: string;
	minDate?: Date | string;
	maxDate?: Date | string;
}

/**
 * Custom validation rule
 */
export interface CustomRule extends BaseValidationRule {
	type: 'custom';
	validator: (value: any, data: any) => boolean | string | Promise<boolean | string>;
}

/**
 * Union of all validation rules
 */
export type ValidationRule =
	| RequiredRule
	| MinLengthRule
	| MaxLengthRule
	| MinRule
	| MaxRule
	| PatternRule
	| EmailRule
	| UrlRule
	| NumberRule
	| IntegerRule
	| BooleanRule
	| DateRule
	| CustomRule;

/**
 * Validation result for a single field
 */
export interface FieldValidationResult {
	field: string;
	valid: boolean;
	errors: string[];
	warnings?: string[];
	value: any;
}

/**
 * Validation result for entire form/object
 */
export interface ValidationResult {
	valid: boolean;
	errors: Record<string, string[]>;
	warnings?: Record<string, string[]>;
	fields: Record<string, FieldValidationResult>;
	summary: {
		totalFields: number;
		validFields: number;
		invalidFields: number;
		totalErrors: number;
		totalWarnings: number;
	};
}

/**
 * Field schema definition
 */
export interface FieldSchema {
	name: string;
	type?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
	label?: string;
	description?: string;
	required?: boolean;
	rules: ValidationRule[];
	defaultValue?: any;
	transform?: (value: any) => any;
	dependencies?: string[];
}

/**
 * Form/object schema definition
 */
export interface Schema {
	fields: Record<string, FieldSchema>;
	rules?: ValidationRule[];
	transform?: (data: any) => any;
	metadata?: {
		title?: string;
		description?: string;
		version?: string;
	};
}

/**
 * Validation context
 */
export interface ValidationContext {
	data: any;
	field?: string;
	schema: Schema;
	options: ValidationOptions;
	path: string[];
}

/**
 * Validation options
 */
export interface ValidationOptions {
	abortEarly?: boolean;
	stripUnknown?: boolean;
	allowUnknown?: boolean;
	skipMissing?: boolean;
	context?: any;
	locale?: string;
	dateFormat?: string;
}

/**
 * Validator function type
 */
export type ValidatorFunction<T = any> = (
	value: T,
	context: ValidationContext
) => Promise<FieldValidationResult> | FieldValidationResult;

/**
 * Schema validator interface
 */
export interface SchemaValidator {
	validate: (data: any, options?: ValidationOptions) => Promise<ValidationResult>;
	validateField: (
		field: string,
		value: any,
		data: any,
		options?: ValidationOptions
	) => Promise<FieldValidationResult>;
	addRule: (name: string, validator: ValidatorFunction) => void;
	removeRule: (name: string) => void;
	getSchema: () => Schema;
	updateSchema: (updates: Partial<Schema>) => void;
}

/**
 * Form validation state
 */
export interface FormValidationState {
	isValid: boolean;
	isValidating: boolean;
	hasErrors: boolean;
	hasWarnings: boolean;
	errors: Record<string, string[]>;
	warnings: Record<string, string[]>;
	touched: Record<string, boolean>;
	dirty: Record<string, boolean>;
	validatedAt?: Date;
}

/**
 * Field validation state
 */
export interface FieldValidationState {
	isValid: boolean;
	isValidating: boolean;
	errors: string[];
	warnings: string[];
	touched: boolean;
	dirty: boolean;
	validatedAt?: Date;
}

/**
 * Validation trigger types
 */
export type ValidationTrigger = 'change' | 'blur' | 'submit' | 'manual';

/**
 * Form validation configuration
 */
export interface FormValidationConfig {
	schema: Schema;
	validateOn: ValidationTrigger[];
	revalidateOn: ValidationTrigger[];
	options: ValidationOptions;
	debounceMs?: number;
	onValidation?: (result: ValidationResult) => void;
	onFieldValidation?: (field: string, result: FieldValidationResult) => void;
}

/**
 * Validation error types
 */
export interface ValidationError extends Error {
	field?: string;
	rule?: ValidationRuleType;
	value?: any;
	path?: string[];
}

/**
 * Built-in validation messages
 */
export interface ValidationMessages {
	required: string;
	minLength: string;
	maxLength: string;
	min: string;
	max: string;
	pattern: string;
	email: string;
	url: string;
	number: string;
	integer: string;
	boolean: string;
	date: string;
	custom: string;
}

/**
 * Validation message formatter
 */
export type MessageFormatter = (
	rule: ValidationRule,
	field: FieldSchema,
	value: any,
	context: ValidationContext
) => string;

/**
 * Validation plugin interface
 */
export interface ValidationPlugin {
	name: string;
	version: string;
	rules?: Record<string, ValidatorFunction>;
	messages?: Partial<ValidationMessages>;
	formatters?: Record<string, MessageFormatter>;
	install: (validator: SchemaValidator) => void;
	uninstall: (validator: SchemaValidator) => void;
}

/**
 * Async validation queue item
 */
export interface AsyncValidationItem {
	id: string;
	field: string;
	value: any;
	data: any;
	context: ValidationContext;
	promise: Promise<FieldValidationResult>;
	timestamp: Date;
}

/**
 * Validation cache entry
 */
export interface ValidationCacheEntry {
	key: string;
	result: FieldValidationResult;
	timestamp: Date;
	ttl: number;
}

/**
 * Validation performance metrics
 */
export interface ValidationMetrics {
	totalValidations: number;
	averageTime: number;
	cacheHits: number;
	cacheMisses: number;
	asyncValidations: number;
	errors: number;
	warnings: number;
}
