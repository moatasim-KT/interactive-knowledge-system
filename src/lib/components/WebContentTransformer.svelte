<script lang="ts">
    import { webContentState, webContentActions } from '$lib/stores/webContentState.svelte.ts';
    import { Button, Card, LoadingSpinner, Badge } from '$lib/components/ui/index.ts';
    import { errorHandler } from '$lib/utils/errorHandler.js';
    import { createLogger } from '$lib/utils/logger.js';
    import { interactiveAnalyzer } from '$lib/services/interactiveAnalyzer.ts';

    const logger = createLogger('web-content-transformer');

    interface Props {
        contentId?: string;
        defaultType?: 'auto' | 'visualization' | 'simulation' | 'chart' | 'quiz';
        domain?: string;
    }

    let { contentId, defaultType = 'auto', domain = '' }: Props = $props();

    let selected_type = $state<Props['defaultType']>(defaultType);
    let is_transforming = $state(false);
    let last_result = $state<any>(null);

    $effect(() => {
        // Auto-select current content if not provided
        if (!contentId && webContentState.content.currentContent) {
            contentId = webContentState.content.currentContent.id;
        }
    });

    async function run_transformation() {
        if (!contentId) {
            webContentActions.addNotification({ type: 'warning', message: 'No content selected' });
            return;
        }

        is_transforming = true;
        webContentActions.setTransformationAnalyzing(true);

        const result = await errorHandler.handleAsync(
            () => interactiveAnalyzer.transform(String(contentId), { type: selected_type, domain }),
            { operation: 'transform', component: 'WebContentTransformer', metadata: { contentId, selected_type, domain } },
            { showToast: true, retryable: true, maxRetries: 1 }
        );

        if (result.success && result.data) {
            last_result = result.data;
            webContentActions.setCurrentTransformation(result.data);
            webContentActions.addTransformationToHistory(result.data);
            webContentActions.addNotification({ type: 'success', message: `Transformed (${selected_type}) successfully` });
        }

        is_transforming = false;
        webContentActions.setTransformationAnalyzing(false);
    }
</script>

<Card class="transformer" variant="outlined">
    <div class="header">
        <h3>Transform Content</h3>
        <div class="controls">
            <select bind:value={selected_type} disabled={is_transforming}>
                <option value="auto">Auto</option>
                <option value="visualization">Visualization</option>
                <option value="simulation">Simulation</option>
                <option value="chart">Chart</option>
                <option value="quiz">Quiz</option>
            </select>
            <input
                type="text"
                placeholder="Domain (optional)"
                bind:value={domain}
                disabled={is_transforming}
            />
            <Button onclick={run_transformation} disabled={is_transforming || !contentId}>
                {#if is_transforming}
                    <LoadingSpinner size="sm" class="mr-2" /> Transforming...
                {:else}
                    Run Transformation
                {/if}
            </Button>
        </div>
    </div>

    {#if last_result}
        <div class="result">
            <div class="stats">
                <Badge variant="secondary">Blocks: {last_result.interactiveBlocks?.length || 0}</Badge>
                <Badge variant="secondary">Type: {last_result.metadata?.transformationType}</Badge>
            </div>
        </div>
    {/if}
</Card>

<style>
    .header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .controls { display: flex; align-items: center; gap: 0.5rem; }
    select, input { padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; }
    .stats { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
</style>


