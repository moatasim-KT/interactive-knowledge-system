<script lang="ts">

  import type { 
    ProcessedDocument, 
    KnowledgeNode, 
    ContentRelationship 
  } from '$lib/types/unified';
  import { knowledgeBaseIntegrationService, type IntegrationResult } from '../services/knowledgeBaseIntegrationService.js';
  import { relationshipDetectionService, type RelationshipDetectionResult } from '../services/relationshipDetectionService.js';
  import RelationshipManager from './RelationshipManager.svelte';
  import RelationshipDashboard from './RelationshipDashboard.svelte';
  import Card from './ui/Card.svelte';
  import Button from './ui/Button.svelte';
  import Badge from './ui/Badge.svelte';
  import LoadingSpinner from './ui/LoadingSpinner.svelte';
import { Modal } from './ui/index.ts';
  import { logger } from '../utils/logger.js';

  // Props
  interface Props {
    document?: ProcessedDocument | null;
    existingNodes?: KnowledgeNode[];
    onNodeCreated?: (node: KnowledgeNode) => void;
    onRelationshipCreated?: (relationship: ContentRelationship) => void;
  }

  let { 
    document = null, 
    existingNodes = [], 
    onNodeCreated = () => {}, 
    onRelationshipCreated = () => {} 
  }: Props = $props();

  // State
  let isIntegrating = $state(false);
  let integrationResult = $state<IntegrationResult | null>(null);
  let showRelationshipManager = $state(false);
  let showDashboard = $state(false);
  let selectedNodeId = $state<string | null>(null);
  let allRelationships = $state<ContentRelationship[]>([]);
  let integrationStep = $state<'idle' | 'analyzing' | 'creating-node' | 'detecting-relationships' | 'complete'>('idle');

  // Derived state using runes
  let canIntegrate = $derived(document && existingNodes.length >= 0);
  let hasIntegrationResult = $derived(integrationResult !== null);

  $effect(() => {
    logger.info('KnowledgeBaseIntegration effect triggered', { 
      hasDocument: !!document,
      existingNodesCount: existingNodes.length 
    });
  });

  async function handleIntegrateDocument() {
    if (!document) return;

    isIntegrating = true;
    integrationStep = 'analyzing';

    try {
      logger.info('Starting document integration', { documentId: document.id });

      // Step 1: Analyze relationships
      integrationStep = 'detecting-relationships';
      const relationshipAnalysis = await relationshipDetectionService.analyzeContentRelationships(
        document,
        existingNodes,
        {
          minConfidence: 0.3,
          maxSuggestions: 10,
          analysisDepth: 'medium'
        }
      );

      // Step 2: Create knowledge node
      integrationStep = 'creating-node';
      const result = await knowledgeBaseIntegrationService.integrateDocument(
        document,
        existingNodes,
        {
          autoCreateRelationships: true,
          minRelationshipConfidence: 0.4,
          generateTags: true,
          extractCategories: true,
          assignToCollections: true
        }
      );

      integrationStep = 'complete';
      integrationResult = result;
      allRelationships = [...allRelationships, ...result.relationships];

      // Notify parent components
      onNodeCreated(result.node);
      result.relationships.forEach(rel => onRelationshipCreated(rel));

      logger.info('Document integration completed successfully', {
        nodeId: result.node.id,
        relationshipsCreated: result.relationships.length,
        confidence: result.metadata.confidence
      });

    } catch (error) {
      logger.error('Failed to integrate document', { error, documentId: document.id });
      // Handle error appropriately
    } finally {
      isIntegrating = false;
    }
  }

  async function handleCreateRelationship(relationship: Partial<ContentRelationship>) {
    try {
      // In a real implementation, this would save to your storage system
      const newRelationship: ContentRelationship = {
        id: `rel_${Date.now()}`,
        sourceId: relationship.sourceId!,
        targetId: relationship.targetId!,
        type: relationship.type!,
        strength: relationship.strength!,
        confidence: relationship.confidence || 1.0,
        metadata: relationship.metadata
      };

      allRelationships = [...allRelationships, newRelationship];
      onRelationshipCreated(newRelationship);

      logger.info('Manual relationship created', { relationshipId: newRelationship.id });
    } catch (error) {
      logger.error('Failed to create relationship', { error });
    }
  }

  async function handleUpdateRelationship(relationshipId: string, updates: Partial<ContentRelationship>) {
    try {
      const index = allRelationships.findIndex(r => r.id === relationshipId);
      if (index !== -1) {
        allRelationships[index] = { ...allRelationships[index], ...updates };
        allRelationships = [...allRelationships]; // Trigger reactivity
      }

      logger.info('Relationship updated', { relationshipId });
    } catch (error) {
      logger.error('Failed to update relationship', { error });
    }
  }

  async function handleDeleteRelationship(relationshipId: string) {
    try {
      allRelationships = allRelationships.filter(r => r.id !== relationshipId);
      logger.info('Relationship deleted', { relationshipId });
    } catch (error) {
      logger.error('Failed to delete relationship', { error });
    }
  }

  function handleNodeSelect(nodeId: string) {
    selectedNodeId = nodeId;
  }

  function handleRelationshipClick(relationship: ContentRelationship) {
    // Handle relationship click - could open details modal, etc.
    logger.info('Relationship clicked', { relationshipId: relationship.id });
  }

  function getStepDescription(step: typeof integrationStep): string {
    switch (step) {
      case 'analyzing': return 'Analyzing document content...';
      case 'creating-node': return 'Creating knowledge node...';
      case 'detecting-relationships': return 'Detecting relationships...';
      case 'complete': return 'Integration complete!';
      default: return '';
    }
  }

  function getIntegrationStepProgress(step: typeof integrationStep): number {
    switch (step) {
      case 'analyzing': return 25;
      case 'detecting-relationships': return 50;
      case 'creating-node': return 75;
      case 'complete': return 100;
      default: return 0;
    }
  }
</script>

<div class="knowledge-base-integration p-6 bg-white rounded-lg shadow-sm border">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h2 class="text-xl font-semibold text-gray-900">Knowledge Base Integration</h2>
      <p class="text-sm text-gray-600 mt-1">
        Transform documents into connected knowledge nodes
      </p>
    </div>
    
    <div class="flex items-center gap-3">
      {#if hasIntegrationResult}
        <Button 
          variant="outline" 
          onclick={() => showRelationshipManager = true}
        >
          Manage Relationships
        </Button>
        <Button 
          variant="outline" 
          onclick={() => showDashboard = true}
        >
          View Network
        </Button>
      {/if}
    </div>
  </div>

  <!-- Document Information -->
  {#if document}
    <Card class="p-4 mb-6">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h3 class="font-medium text-gray-900 mb-2">{document.title}</h3>
          <div class="flex items-center gap-4 text-sm text-gray-600">
            <span>Sections: {document.structure.sections.length}</span>
            <span>Content Blocks: {document.content.length}</span>
            <span>Assets: {document.assets.length}</span>
          </div>
          {#if document.metadata.keywords && document.metadata.keywords.length > 0}
            <div class="flex items-center gap-2 mt-3">
              <span class="text-sm text-gray-600">Keywords:</span>
              <div class="flex flex-wrap gap-1">
                {#each document.metadata.keywords.slice(0, 5) as keyword}
                  <Badge variant="outline" class="text-xs">{keyword}</Badge>
                {/each}
                {#if document.metadata.keywords.length > 5}
                  <Badge variant="outline" class="text-xs">+{document.metadata.keywords.length - 5} more</Badge>
                {/if}
              </div>
            </div>
          {/if}
        </div>
        
        <div class="text-right">
          <Button 
            variant="primary" 
            onclick={handleIntegrateDocument}
            disabled={!canIntegrate || isIntegrating}
          >
            {#if isIntegrating}
              <LoadingSpinner size="sm" class="mr-2" />
              Integrating...
            {:else}
              Integrate into Knowledge Base
            {/if}
          </Button>
        </div>
      </div>
    </Card>
  {:else}
    <Card class="p-8 text-center text-gray-500 mb-6">
      <p class="text-lg font-medium">No document selected</p>
      <p class="text-sm mt-1">Upload or process a document to begin integration</p>
    </Card>
  {/if}

  <!-- Integration Progress -->
  {#if isIntegrating}
    <Card class="p-6 mb-6 bg-blue-50 border-blue-200">
      <div class="flex items-center gap-4">
        <LoadingSpinner size="sm" />
        <div class="flex-1">
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium text-blue-900">{getStepDescription(integrationStep)}</span>
            <span class="text-sm text-blue-700">{getIntegrationStepProgress(integrationStep)}%</span>
          </div>
          <div class="w-full bg-blue-200 rounded-full h-2">
            <div 
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style="width: {getIntegrationStepProgress(integrationStep)}%"
            ></div>
          </div>
        </div>
      </div>
    </Card>
  {/if}

  <!-- Integration Results -->
  {#if integrationResult}
    <div class="space-y-6">
      <!-- Created Node -->
      <Card class="p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Created Knowledge Node</h3>
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h4 class="font-medium text-gray-900 mb-2">{integrationResult.node.title}</h4>
            <div class="flex items-center gap-4 text-sm text-gray-600 mb-3">
              <span>Type: {integrationResult.node.type}</span>
              <span>Interactivity: {integrationResult.node.interactivity}</span>
              <span>Version: {integrationResult.node.metadata?.version}</span>
            </div>
            {#if integrationResult.node.metadata?.tags && integrationResult.node.metadata.tags.length > 0}
              <div class="flex items-center gap-2 mb-3">
                <span class="text-sm text-gray-600">Tags:</span>
                <div class="flex flex-wrap gap-1">
                  {#each integrationResult.node.metadata.tags as tag}
                    <Badge variant="outline" class="text-xs">{tag}</Badge>
                  {/each}
                </div>
              </div>
            {/if}
            {#if integrationResult.node.metadata?.categories && integrationResult.node.metadata.categories.length > 0}
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-600">Categories:</span>
                <div class="flex flex-wrap gap-1">
                  {#each integrationResult.node.metadata.categories as category}
                    <Badge class="text-xs bg-purple-100 text-purple-800">{category}</Badge>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
          
          <div class="text-right">
            <div class="text-sm text-gray-600">
              Processing time: {integrationResult.metadata.processingTime}ms
            </div>
            <div class="text-sm text-gray-600">
              Confidence: {Math.round(integrationResult.metadata.confidence * 100)}%
            </div>
          </div>
        </div>
      </Card>

      <!-- Relationships Created -->
      {#if integrationResult.relationships.length > 0}
        <Card class="p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            Relationships Created ({integrationResult.relationships.length})
          </h3>
          <div class="space-y-3">
            {#each integrationResult.relationships as relationship}
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <span class="font-medium text-gray-900">
                    {existingNodes.find(n => n.id === relationship.targetId)?.title || 'Unknown Node'}
                  </span>
                  <Badge class="text-xs bg-blue-100 text-blue-800">{relationship.type}</Badge>
                  <Badge class="text-xs bg-green-100 text-green-800">{relationship.strength}</Badge>
                </div>
                <div class="text-sm text-gray-600">
                  {Math.round(relationship.confidence * 100)}% confidence
                </div>
              </div>
            {/each}
          </div>
        </Card>
      {/if}

      <!-- Suggestions -->
      {#if integrationResult.suggestions.suggestedConnections.length > 0}
        <Card class="p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            Additional Suggestions ({integrationResult.suggestions.suggestedConnections.length})
          </h3>
          <div class="space-y-3">
            {#each integrationResult.suggestions.suggestedConnections as suggestion}
              <div class="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div class="flex items-center gap-3">
                  <span class="font-medium text-gray-900">
                    {existingNodes.find(n => n.id === suggestion.targetNodeId)?.title || 'Unknown Node'}
                  </span>
                  <Badge class="text-xs bg-yellow-100 text-yellow-800">{suggestion.relationshipType}</Badge>
                  <Badge class="text-xs bg-orange-100 text-orange-800">{suggestion.strength}</Badge>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-sm text-gray-600">
                    {Math.round(suggestion.confidence * 100)}% confidence
                  </span>
                  <Button size="sm" variant="outline">Accept</Button>
                </div>
              </div>
            {/each}
          </div>
        </Card>
      {/if}
    </div>
  {/if}
</div>

<!-- Relationship Manager Modal -->
<Modal bind:open={showRelationshipManager} title="Relationship Management" size="lg">
  {#if integrationResult}
    <RelationshipManager
      nodeId={integrationResult.node.id}
      currentRelationships={allRelationships.filter(r => 
        r.sourceId === integrationResult.node.id || r.targetId === integrationResult.node.id
      )}
      suggestedConnections={integrationResult.suggestions.suggestedConnections}
      availableNodes={existingNodes}
      onRelationshipCreate={handleCreateRelationship}
      onRelationshipUpdate={handleUpdateRelationship}
      onRelationshipDelete={handleDeleteRelationship}
    />
  {/if}
</Modal>

<!-- Network Dashboard Modal -->
<Modal bind:open={showDashboard} title="Knowledge Network Dashboard" size="lg">
  <RelationshipDashboard
    nodes={integrationResult ? [...existingNodes, integrationResult.node] : existingNodes}
    relationships={allRelationships}
    selectedNodeId={selectedNodeId}
    onNodeSelect={handleNodeSelect}
    onRelationshipClick={handleRelationshipClick}
  />
</Modal>

<style>
  .knowledge-base-integration {
    max-width: 100%;
  }

  @media (max-width: 768px) {
    .knowledge-base-integration {
      padding: 1rem;
    }
  }
</style>