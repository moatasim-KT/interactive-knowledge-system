<script lang="ts">
  import type { 
    KnowledgeNode, 
    ContentRelationship, 
    RelationshipStrength 
  } from '$lib/types/unified';
  import type { SuggestedConnection } from '../services/relationshipDetectionService.js';
  import Button from './ui/Button.svelte';
  import Card from './ui/Card.svelte';
  import Badge from './ui/Badge.svelte';
import { Modal } from './ui/index.ts';
  import Input from './ui/Input.svelte';
  import LoadingSpinner from './ui/LoadingSpinner.svelte';
  import { logger } from '../utils/logger.js';

  // Props
  let { 
    nodeId,
    currentRelationships = [],
    suggestedConnections = [],
    availableNodes = [],
    onRelationshipCreate,
    onRelationshipUpdate,
    onRelationshipDelete
  }: {
		nodeId: string;
		currentRelationships?: ContentRelationship[];
		suggestedConnections?: SuggestedConnection[];
		availableNodes?: KnowledgeNode[];
		onRelationshipCreate: (relationship: Partial<ContentRelationship>) => Promise<void>;
		onRelationshipUpdate: (relationshipId: string, updates: Partial<ContentRelationship>) => Promise<void>;
		onRelationshipDelete: (relationshipId: string) => Promise<void>;
	} = $props();

  // State
  let isLoading = $state(false);
  let showCreateModal = $state(false);
  let showEditModal = $state(false);
  let selectedRelationship = $state<ContentRelationship | null>(null);
  let searchQuery = $state('');
  let newRelationship = $state<Partial<ContentRelationship>>({
    type: 'related',
    strength: 'medium'
  });

  // Reactive statements
  let filteredNodes = $derived(availableNodes.filter(node => 
    node.id !== nodeId && 
    node.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !currentRelationships.some(rel => rel.targetId === node.id)
  ));

  let relationshipsByStrength = $derived(groupRelationshipsByStrength(currentRelationships));

  $effect(() => {
    logger.info('RelationshipManager mounted', { nodeId, relationshipCount: currentRelationships.length });
  });

  function groupRelationshipsByStrength(relationships: ContentRelationship[]) {
    const groups: Record<RelationshipStrength, ContentRelationship[]> = {
      'strong': [],
      'medium': [],
      'weak': [],
      'very-weak': []
    };

    relationships.forEach(rel => {
      if (groups[rel.strength]) {
        groups[rel.strength].push(rel);
      }
    });

    return groups;
  }

  function getStrengthColor(strength: RelationshipStrength): string {
    switch (strength) {
      case 'strong': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'weak': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'very-weak': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-blue-600';
    if (confidence >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  }

  async function handleCreateRelationship() {
    if (!newRelationship.targetId || !newRelationship.type) {
      return;
    }

    isLoading = true;
    try {
      const relationship: Partial<ContentRelationship> = {
        ...newRelationship,
        sourceId: nodeId,
        confidence: 1.0, // Manual relationships have full confidence
        metadata: {
          created: new Date(),
          detectionMethod: 'manual'
        }
      };

      await onRelationshipCreate(relationship);
      showCreateModal = false;
      resetNewRelationship();
      logger.info('Relationship created successfully', { sourceId: nodeId, targetId: newRelationship.targetId });
    } catch (error) {
      logger.error('Failed to create relationship', { error });
    } finally {
      isLoading = false;
    }
  }

  async function handleAcceptSuggestion(suggestion: SuggestedConnection) {
    isLoading = true;
    try {
      const relationship: Partial<ContentRelationship> = {
        sourceId: nodeId,
        targetId: suggestion.targetNodeId,
        type: suggestion.relationshipType,
        strength: suggestion.strength,
        confidence: suggestion.confidence,
        metadata: {
          created: new Date(),
          detectionMethod: 'suggested',
          suggestionReason: suggestion.reason
        }
      };

      await onRelationshipCreate(relationship);
      logger.info('Suggestion accepted', { targetId: suggestion.targetNodeId });
    } catch (error) {
      logger.error('Failed to accept suggestion', { error });
    } finally {
      isLoading = false;
    }
  }

  async function handleEditRelationship() {
    if (!selectedRelationship) return;

    isLoading = true;
    try {
      await onRelationshipUpdate(selectedRelationship.id, {
        type: selectedRelationship.type,
        strength: selectedRelationship.strength
      });
      showEditModal = false;
      selectedRelationship = null;
      logger.info('Relationship updated successfully', { relationshipId: selectedRelationship.id });
    } catch (error) {
      logger.error('Failed to update relationship', { error });
    } finally {
      isLoading = false;
    }
  }

  async function handleDeleteRelationship(relationshipId: string) {
    if (!confirm('Are you sure you want to delete this relationship?')) {
      return;
    }

    isLoading = true;
    try {
      await onRelationshipDelete(relationshipId);
      logger.info('Relationship deleted successfully', { relationshipId });
    } catch (error) {
      logger.error('Failed to delete relationship', { error });
    } finally {
      isLoading = false;
    }
  }

  function openEditModal(relationship: ContentRelationship) {
    selectedRelationship = { ...relationship };
    showEditModal = true;
  }

  function resetNewRelationship() {
    newRelationship = {
      type: 'related',
      strength: 'medium'
    };
    searchQuery = '';
  }

  function getNodeTitle(nodeId: string): string {
    const node = availableNodes.find(n => n.id === nodeId);
    return node?.title || 'Unknown Node';
  }
</script>

<div class="relationship-manager p-6 bg-white rounded-lg shadow-sm border">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-xl font-semibold text-gray-900">Relationship Management</h2>
    <Button 
      variant="primary" 
      onclick={() => showCreateModal = true}
      disabled={isLoading}
    >
      Add Relationship
    </Button>
  </div>

  <!-- Current Relationships -->
  <div class="mb-8">
    <h3 class="text-lg font-medium text-gray-800 mb-4">Current Relationships</h3>
    
    {#if currentRelationships.length === 0}
      <div class="text-center py-8 text-gray-500">
        <p>No relationships found. Create some connections to see them here.</p>
      </div>
    {:else}
      {#each Object.entries(relationshipsByStrength) as [strength, relationships]}
        {#if relationships.length > 0}
          <div class="mb-6">
            <h4 class="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wide">
              {strength} Connections ({relationships.length})
            </h4>
            <div class="grid gap-3">
              {#each relationships as relationship}
                <Card class="p-4">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-3 mb-2">
                        <h5 class="font-medium text-gray-900">
                          {getNodeTitle(relationship.targetId)}
                        </h5>
                        <Badge class={getStrengthColor(relationship.strength)}>
                          {relationship.strength}
                        </Badge>
                        <Badge variant="outline" class="text-xs">
                          {relationship.type}
                        </Badge>
                      </div>
                      <div class="flex items-center gap-4 text-sm text-gray-600">
                        <span class={getConfidenceColor(relationship.confidence)}>
                          Confidence: {Math.round(relationship.confidence * 100)}%
                        </span>
                        <span>
                          Created: {relationship.metadata?.created?.toLocaleDateString() || 'Unknown'}
                        </span>
                        <span>
                          Method: {relationship.metadata?.detectionMethod || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onclick={() => openEditModal(relationship)}
                        disabled={isLoading}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        class="text-red-600 hover:text-red-700"
                        onclick={() => handleDeleteRelationship(relationship.id)}
                        disabled={isLoading}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    {/if}
  </div>

  <!-- Suggested Connections -->
  {#if suggestedConnections.length > 0}
    <div class="mb-8">
      <h3 class="text-lg font-medium text-gray-800 mb-4">Suggested Connections</h3>
      <div class="grid gap-3">
        {#each suggestedConnections as suggestion}
          <Card class="p-4 border-dashed border-blue-200 bg-blue-50">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h5 class="font-medium text-gray-900">
                    {getNodeTitle(suggestion.targetNodeId)}
                  </h5>
                  <Badge class={getStrengthColor(suggestion.strength)}>
                    {suggestion.strength}
                  </Badge>
                  <Badge variant="outline" class="text-xs">
                    {suggestion.relationshipType}
                  </Badge>
                </div>
                <div class="flex items-center gap-4 text-sm text-gray-600">
                  <span class={getConfidenceColor(suggestion.confidence)}>
                    Confidence: {Math.round(suggestion.confidence * 100)}%
                  </span>
                  <span>Reason: {suggestion.reason}</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onclick={() => handleAcceptSuggestion(suggestion)}
                  disabled={isLoading}
                >
                  Accept
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  class="text-gray-500"
                  disabled={isLoading}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </Card>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Loading Overlay -->
  {#if isLoading}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-lg flex items-center gap-3">
        <LoadingSpinner size="sm" />
        <span>Processing relationship...</span>
      </div>
    </div>
  {/if}
</div>

<!-- Create Relationship Modal -->
<Modal bind:open={showCreateModal} title="Create New Relationship">
  <div class="space-y-4">
    <div>
      <label for="search" class="block text-sm font-medium text-gray-700 mb-2">
        Search for nodes to connect
      </label>
      <Input
        id="search"
        type="text"
        placeholder="Type to search nodes..."
        bind:value={searchQuery}
      />
    </div>

    {#if searchQuery && filteredNodes.length > 0}
      <div class="max-h-48 overflow-y-auto border rounded-md">
        {#each filteredNodes as node}
          <button
            class="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
            class:bg-blue-50={newRelationship.targetId === node.id}
            onclick={() => newRelationship.targetId = node.id}
          >
            <div class="font-medium text-gray-900">{node.title}</div>
            <div class="text-sm text-gray-600">{node.type}</div>
          </button>
        {/each}
      </div>
    {/if}

    {#if newRelationship.targetId}
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="type" class="block text-sm font-medium text-gray-700 mb-2">
            Relationship Type
          </label>
          <select
            id="type"
            bind:value={newRelationship.type}
            class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="related">Related</option>
            <option value="similar">Similar</option>
            <option value="prerequisite">Prerequisite</option>
            <option value="follows">Follows</option>
            <option value="references">References</option>
            <option value="contradicts">Contradicts</option>
          </select>
        </div>

        <div>
          <label for="strength" class="block text-sm font-medium text-gray-700 mb-2">
            Connection Strength
          </label>
          <select
            id="strength"
            bind:value={newRelationship.strength}
            class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="strong">Strong</option>
            <option value="medium">Medium</option>
            <option value="weak">Weak</option>
          </select>
        </div>
      </div>
    {/if}
  </div>

  <div class="mt-6 flex justify-end gap-3">
    <Button variant="ghost" onclick={() => { showCreateModal = false; resetNewRelationship(); }}>
      Cancel
    </Button>
    <Button 
      variant="primary" 
      onclick={handleCreateRelationship}
      disabled={!newRelationship.targetId || !newRelationship.type || isLoading}
    >
      Create Relationship
    </Button>
  </div>
</Modal>

<!-- Edit Relationship Modal -->
<Modal bind:open={showEditModal} title="Edit Relationship">
  {#if selectedRelationship}
    <div class="space-y-4">
      <div>
        <div class="block text-sm font-medium text-gray-700 mb-2">
          Connected to: {getNodeTitle(selectedRelationship.targetId)}
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="edit-type" class="block text-sm font-medium text-gray-700 mb-2">
            Relationship Type
          </label>
          <select
            id="edit-type"
            bind:value={selectedRelationship.type}
            class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="related">Related</option>
            <option value="similar">Similar</option>
            <option value="prerequisite">Prerequisite</option>
            <option value="follows">Follows</option>
            <option value="references">References</option>
            <option value="contradicts">Contradicts</option>
          </select>
        </div>

        <div>
          <label for="edit-strength" class="block text-sm font-medium text-gray-700 mb-2">
            Connection Strength
          </label>
          <select
            id="edit-strength"
            bind:value={selectedRelationship.strength}
            class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="strong">Strong</option>
            <option value="medium">Medium</option>
            <option value="weak">Weak</option>
          </select>
        </div>
      </div>
    </div>

    <div class="mt-6 flex justify-end gap-3">
      <Button variant="ghost" onclick={() => { showEditModal = false; selectedRelationship = null; }}>
        Cancel
      </Button>
      <Button 
        variant="primary" 
        onclick={handleEditRelationship}
        disabled={isLoading}
      >
        Save Changes
      </Button>
    </div>
  {/if}
</Modal>

<style>
  .relationship-manager {
    max-width: 100%;
  }

  @media (max-width: 768px) {
    .relationship-manager {
      padding: 1rem;
    }
    
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>