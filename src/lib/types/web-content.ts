// Minimal type definitions to satisfy imports in event-types.ts
// Extend as needed by features using these types

export interface WebContent {
  id: string;
  url: string;
  title?: string;
  html?: string;
}

export interface WebContentSource {
  id: string;
  type: 'url' | 'rss' | 'sitemap' | 'file' | 'api';
  url?: string;
  name?: string;
  enabled?: boolean;
}

export interface ChartData {
  labels?: any[];
  datasets: Array<Record<string, any>>;
}

export interface DataFilter {
  key: string;
  operator?: string;
  value?: any;
}

export interface SimulationParameter {
  name: string;
  value: number | string | boolean;
  min?: number;
  max?: number;
}

export interface InteractiveVisualizationBlock {
  id: string;
  config?: Record<string, any>;
}

export interface InteractiveChartBlock {
  id: string;
  chartType?: string;
  config?: Record<string, any>;
}

export interface SimulationBlock {
  id: string;
  parameters?: SimulationParameter[];
}

export interface SystemDiagramBlock {
  id: string;
  nodes?: any[];
  edges?: any[];
}
