/**
 * Headless bridge for Svelte store actions used by the MCP server.
 * In a Node (stdio) context there is no Svelte runtime, so these are safe no-ops.
 */

type Notification = {
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
};

export const svelteActions = {
    addNotification(_n: Notification): void {
        // no-op in headless MCP
    },
    setContentProcessing(_processing: boolean, _progress: number): void {
        // no-op
    },
    addContent(_content: any): void {
        // no-op
    },
    addSource(_source: any): void {
        // no-op
    },
    addBatchJob(_job: any): void {
        // no-op
    },
    setActiveBatchJob(_job: any): void {
        // no-op
    },
    setBatchProcessing(_processing: boolean): void {
        // no-op
    },
    updateBatchJob(_id: string, _updates: any): void {
        // no-op
    },
    setTransformationAnalyzing(_analyzing: boolean): void {
        // no-op
    },
    setTransformationOpportunities(_ops: any[]): void {
        // no-op
    },
    setCurrentTransformation(_t: any): void {
        // no-op
    },
    addTransformationToHistory(_t: any): void {
        // no-op
    }
};


