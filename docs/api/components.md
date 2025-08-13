# Component API Documentation

## Core Components

### ContentEditor

Interactive content editor supporting multiple content block types.

```typescript
interface ContentEditorProps {
  content: ContentBlock[];
  readonly?: boolean;
  theme?: 'light' | 'dark';
  onContentChange?: (content: ContentBlock[]) => void;
  onSave?: (content: ContentBlock[]) => Promise<void>;
}
```

**Usage:**

```svelte
<ContentEditor bind:content={moduleContent} theme="dark" onSave={handleSave} />
```

### KnowledgeTree

Hierarchical navigation component for knowledge modules.

```typescript
interface KnowledgeTreeProps {
  nodes: KnowledgeNode[];
  selectedNode?: string;
  expandAll?: boolean;
  showProgress?: boolean;
  onNodeSelect?: (nodeId: string) => void;
}
```

### QuizComponent

Interactive quiz component with multiple question types.

```typescript
interface QuizComponentProps {
  questions: Question[];
  showResults?: boolean;
  allowRetry?: boolean;
  timeLimit?: number;
  onComplete?: (results: QuizResults) => void;
}
```

## UI Components

### Button

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onclick?: () => void;
}
```

### Modal

```typescript
interface ModalProps {
  open: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
  onClose?: () => void;
}
```

### Card

```typescript
interface CardProps {
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'outlined' | 'elevated';
  clickable?: boolean;
}
```

## Interactive Components

### InteractiveChart

```typescript
interface InteractiveChartProps {
  data: ChartData[];
  type: 'line' | 'bar' | 'scatter' | 'pie';
  interactive?: boolean;
  onDataPointClick?: (point: ChartData) => void;
}
```

### CodeEditor

```typescript
interface CodeEditorProps {
  code: string;
  language: string;
  theme?: 'light' | 'dark';
  readonly?: boolean;
  executable?: boolean;
  onCodeChange?: (code: string) => void;
}
```

### SimulationBlock

```typescript
interface SimulationBlockProps {
  type: 'algorithm' | 'process' | 'system';
  config: SimulationConfig;
  autoPlay?: boolean;
  speed?: number;
}
```

## Layout Components

### ResponsiveGrid

```typescript
interface ResponsiveGridProps {
  columns?: number | ResponsiveColumns;
  gap?: string;
  minItemWidth?: string;
}
```

### ResponsiveContainer

```typescript
interface ResponsiveContainerProps {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  center?: boolean;
}
```

## Media Components

### LazyMedia

```typescript
interface LazyMediaProps {
  src: string;
  alt?: string;
  type: 'image' | 'video';
  loading?: 'lazy' | 'eager';
}
```

### MediaUpload

```typescript
interface MediaUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  onUpload?: (files: File[]) => Promise<UploadResult[]>;
}
```

## Progress Components

### ProgressTracker

```typescript
interface ProgressTrackerProps {
  modules: ModuleProgress[];
  showDetails?: boolean;
  onModuleClick?: (moduleId: string) => void;
}
```

### ProgressBar

```typescript
interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  animated?: boolean;
}
```

## Error Handling Components

### ErrorBoundary

```typescript
interface ErrorBoundaryProps {
  fallback?: ComponentType;
  onError?: (error: Error) => void;
}
```

### LoadingBoundary

```typescript
interface LoadingBoundaryProps {
  loading: boolean;
  fallback?: ComponentType;
  delay?: number;
}
```

## Accessibility Features

All components include:

- ARIA labels for screen readers
- Keyboard navigation support
- Focus management
- WCAG 2.1 AA compliant colors
- Scalable text support

## Usage Examples

```svelte
<script>
  import { ContentEditor, KnowledgeTree, QuizComponent } from '$lib/components';

  let content = [];
  let nodes = [];
  let questions = [];
</script>

<ContentEditor bind:content />
<KnowledgeTree {nodes} />
<QuizComponent {questions} />
```
