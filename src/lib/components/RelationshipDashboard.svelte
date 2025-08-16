<script lang="ts">
  import type { 
    KnowledgeNode, 
    ContentRelationship, 
    RelationshipStrength 
  } from '$lib/types/unified';
  import Card from "./ui/Card.svelte";
  import Badge from './ui/Badge.svelte';
  import Button from './ui/Button.svelte';
  import LoadingSpinner from './ui/LoadingSpinner.svelte';
  import { logger } from '../utils/logger.js';

  // Props
  interface Props {
    nodes?: KnowledgeNode[];
    relationships?: ContentRelationship[];
    selectedNodeId?: string | null;
    onNodeSelect?: (nodeId: string) => void;
    onRelationshipClick?: (relationship: ContentRelationship) => void;
  }

  let { 
    nodes = [], 
    relationships = [], 
    selectedNodeId = null, 
    onNodeSelect = () => {}, 
    onRelationshipClick = () => {} 
  }: Props = $props();

  // State
  let isLoading = $state(false);
  let viewMode = $state<'network' | 'list' | 'matrix'>('network');
  let filterStrength = $state<RelationshipStrength | 'all'>('all');
  let searchQuery = $state('');

  // Derived state using runes
  let filteredRelationships = $derived(() => {
    return relationships.filter(rel => {
      const matchesStrength = filterStrength === 'all' || rel.strength === filterStrength;
      const matchesSearch = searchQuery === '' || 
        getNodeTitle(rel.sourceId).toLowerCase().includes(searchQuery.toLowerCase()) ||
        getNodeTitle(rel.targetId).toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStrength && matchesSearch;
    });
  });

  let selectedNodeRelationships = $derived(() => {
    return selectedNodeId 
      ? filteredRelationships().filter(rel => 
          rel.sourceId === selectedNodeId || rel.targetId === selectedNodeId
        )
      : [];
  });

  let relationshipStats = $derived(() => calculateRelationshipStats(filteredRelationships()));
  let networkData = $derived(() => buildNetworkData(nodes, filteredRelationships()));

  $effect(() => {
    logger.info('RelationshipDashboard state updated', { 
      nodeCount: nodes.length, 
      relationshipCount: relationships.length 
    });
  });

  function calculateRelationshipStats(rels: ContentRelationship[]) {
    const stats = {
      total: rels.length,
      byStrength: {
        strong: 0,
        medium: 0,
        weak: 0,
        'very-weak': 0
      },
      byType: {} as Record<string, number>,
      avgConfidence: 0
    };

    rels.forEach(rel => {
      stats.byStrength[rel.strength]++;
      stats.byType[rel.type] = (stats.byType[rel.type] || 0) + 1;
    });

    stats.avgConfidence = rels.length > 0 
      ? rels.reduce((sum, rel) => sum + rel.confidence, 0) / rels.length 
      : 0;

    return stats;
  }

  function buildNetworkData(nodeList: KnowledgeNode[], relList: ContentRelationship[]) {
    const nodeMap = new Map(nodeList.map(node => [node.id, node]));
    const connections = new Map<string, number>();

    // Count connections per node
    relList.forEach(rel => {
      connections.set(rel.sourceId, (connections.get(rel.sourceId) || 0) + 1);
      connections.set(rel.targetId, (connections.get(rel.targetId) || 0) + 1);
    });

    return {
      nodes: nodeList.map(node => ({
        ...node,
        connectionCount: connections.get(node.id) || 0,
        isSelected: node.id === selectedNodeId
      })),
      relationships: relList
    };
  }

  function getNodeTitle(nodeId: string): string {
    const node = nodes.find(n => n.id === nodeId);
    return node?.title || 'Unknown Node';
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

  function getConnectionStrengthWidth(strength: RelationshipStrength): string {
    switch (strength) {
      case 'strong': return '4px';
      case 'medium': return '3px';
      case 'weak': return '2px';
      case 'very-weak': return '1px';
      default: return '1px';
    }
  }

  function getConnectionStrengthColor(strength: RelationshipStrength): string {
    switch (strength) {
      case 'strong': return '#10b981';
      case 'medium': return '#3b82f6';
      case 'weak': return '#f59e0b';
      case 'very-weak': return '#6b7280';
      default: return '#6b7280';
    }
  }

  function handleNodeClick(nodeId: string) {
    selectedNodeId = nodeId === selectedNodeId ? null : nodeId;
    onNodeSelect(selectedNodeId || '');
  }

  function getNodeSize(connectionCount: number): number {
    return Math.max(40, Math.min(80, 40 + connectionCount * 5));
  }
</script>

<div class="relationship-dashboard p-6 bg-white rounded-lg shadow-sm border">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h2 class="text-xl font-semibold text-gray-900">Knowledge Network</h2>
      <p class="text-sm text-gray-600 mt-1">
        Visualize and explore relationships between content nodes
      </p>
    </div>
    
    <div class="flex items-center gap-3">
      <select
        bind:value={viewMode}
        class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="network">Network View</option>
        <option value="list">List View</option>
        <option value="matrix">Matrix View</option>
      </select>
    </div>
  </div>

  <!-- Filters and Search -->
  <div class="flex flex-col sm:flex-row gap-4 mb-6">
    <div class="flex-1">
      <input
        type="text"
        placeholder="Search nodes or relationships..."
        bind:value={searchQuery}
        class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
    
    <select
      bind:value={filterStrength}
      class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="all">All Strengths</option>
      <option value="strong">Strong</option>
      <option value="medium">Medium</option>
      <option value="weak">Weak</option>
      <option value="very-weak">Very Weak</option>
    </select>
  </div>

  <!-- Statistics -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
    <Card class="p-4 text-center">
      <div class="text-2xl font-bold text-gray-900">{nodes.length}</div>
      <div class="text-sm text-gray-600">Nodes</div>
    </Card>
    
    <Card class="p-4 text-center">
      <div class="text-2xl font-bold text-gray-900">{relationshipStats().total}</div>
      <div class="text-sm text-gray-600">Relationships</div>
    </Card>
    
    <Card class="p-4 text-center">
      <div class="text-2xl font-bold text-gray-900">{relationshipStats().byStrength.strong}</div>
      <div class="text-sm text-gray-600">Strong Connections</div>
    </Card>
    
    <Card class="p-4 text-center">
      <div class="text-2xl font-bold text-gray-900">
        {Math.round(relationshipStats().avgConfidence * 100)}%
      </div>
      <div class="text-sm text-gray-600">Avg Confidence</div>
    </Card>
  </div>

  <!-- Main Content -->
  {#if viewMode === 'network'}
    <!-- Network Visualization -->
    <div class="network-container bg-gray-50 rounded-lg p-6 min-h-96 relative overflow-hidden">
      <svg class="w-full h-96" viewBox="0 0 800 400">
        <!-- Relationships (drawn first, so they appear behind nodes) -->
        {#each filteredRelationships() as relationship, i}
          {@const sourceNode = networkData().nodes.find(n => n.id === relationship.sourceId)}
          {@const targetNode = networkData().nodes.find(n => n.id === relationship.targetId)}
          {#if sourceNode && targetNode}
            {@const x1 = 100 + (i % 7) * 100}
            {@const y1 = 100 + Math.floor(i / 7) * 80}
            {@const x2 = 150 + ((i + 1) % 7) * 100}
            {@const y2 = 120 + Math.floor((i + 1) / 7) * 80}
            
            <line
              {x1} {y1} {x2} {y2}
              stroke={getConnectionStrengthColor(relationship.strength)}
              stroke-width={getConnectionStrengthWidth(relationship.strength)}
              opacity="0.6"
              class="cursor-pointer hover:opacity-100 transition-opacity"
              role="button"
              tabindex="0"
              onclick={() => onRelationshipClick(relationship)}
              onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onRelationshipClick(relationship)}
            />
          {/if}
        {/each}

        <!-- Nodes -->
        {#each networkData().nodes as node, i}
          {@const x = 100 + (i % 7) * 100}
          {@const y = 100 + Math.floor(i / 7) * 80}
          {@const size = getNodeSize(node.connectionCount)}
          
          <g class="cursor-pointer" role="button" tabindex="0" onclick={() => handleNodeClick(node.id)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleNodeClick(node.id)}>
            <circle
              cx={x}
              cy={y}
              r={size / 2}
              fill={node.isSelected ? '#3b82f6' : '#e5e7eb'}
              stroke={node.isSelected ? '#1d4ed8' : '#9ca3af'}
              stroke-width="2"
              class="hover:fill-blue-100 transition-colors"
            />
            <text
              x={x}
              y={y + 5}
              text-anchor="middle"
              class="text-xs font-medium fill-gray-700 pointer-events-none"
            >
              {node.title.length > 10 ? node.title.substring(0, 10) + '...' : node.title}
            </text>
            <text
              x={x}
              y={y + size/2 + 15}
              text-anchor="middle"
              class="text-xs fill-gray-500 pointer-events-none"
            >
              {node.connectionCount} connections
            </text>
          </g>
        {/each}
      </svg>
      
      {#if networkData().nodes.length === 0}
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center text-gray-500">
            <p class="text-lg font-medium">No nodes to display</p>
            <p class="text-sm">Add some content to see the knowledge network</p>
          </div>
        </div>
      {/if}
    </div>

  {:else if viewMode === 'list'}
    <!-- List View -->
    <div class="space-y-4">
      {#if selectedNodeId && selectedNodeRelationships().length > 0}
        <div class="mb-6">
          <h3 class="text-lg font-medium text-gray-800 mb-3">
            Relationships for: {getNodeTitle(selectedNodeId)}
          </h3>
          <div class="grid gap-3">
            {#each selectedNodeRelationships() as relationship}
              <Card class="p-4 hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between cursor-pointer" role="button" tabindex="0" onclick={() => onRelationshipClick(relationship)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onRelationshipClick(relationship)}>
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <span class="font-medium text-gray-900">
                        {relationship.sourceId === selectedNodeId 
                          ? getNodeTitle(relationship.targetId)
                          : getNodeTitle(relationship.sourceId)}
                      </span>
                      <Badge class={getStrengthColor(relationship.strength)}>
                        {relationship.strength}
                      </Badge>
                      <Badge variant="outline" class="text-xs">
                        {relationship.type}
                      </Badge>
                    </div>
                    <div class="text-sm text-gray-600">
                      Confidence: {Math.round(relationship.confidence * 100)}%
                    </div>
                  </div>
                  <div class="text-sm text-gray-500">
                    {relationship.sourceId === selectedNodeId ? '→' : '←'}
                  </div>
                </div>
              </Card>
            {/each}
          </div>
        </div>
      {/if}

      <div>
        <h3 class="text-lg font-medium text-gray-800 mb-3">All Nodes</h3>
        <div class="grid gap-3">
          {#each networkData().nodes as node}
            <Card class={`p-4 hover:shadow-md transition-shadow ${node.isSelected ? 'ring-2 ring-blue-500' : ''}`}>
              <div class="flex items-center justify-between cursor-pointer" role="button" tabindex="0" onclick={() => handleNodeClick(node.id)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleNodeClick(node.id)}>
                <div class="flex-1">
                  <h4 class="font-medium text-gray-900 mb-1">{node.title}</h4>
                  <div class="flex items-center gap-4 text-sm text-gray-600">
                    <span>{node.connectionCount} connections</span>
                    <span>Type: {node.type}</span>
                    <span>Interactivity: {node.interactivity}</span>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-sm text-gray-500">Unknown date</div>
                </div>
              </div>
            </Card>
          {/each}
        </div>
      </div>
    </div>

  {:else if viewMode === 'matrix'}
    <!-- Matrix View -->
    <div class="overflow-x-auto">
      <div class="min-w-max">
        <div class="grid gap-1" style="grid-template-columns: 200px repeat({nodes.length}, 40px);">
          <!-- Header row -->
          <div class="p-2"></div>
          {#each nodes as node}
            <div class="p-1 text-xs text-center font-medium text-gray-600 transform -rotate-45 origin-bottom-left">
              {node.title.substring(0, 8)}
            </div>
          {/each}

          <!-- Matrix rows -->
          {#each nodes as sourceNode}
            <div class="p-2 text-sm font-medium text-gray-800 truncate">
              {sourceNode.title}
            </div>
            {#each nodes as targetNode}
              {@const relationship = filteredRelationships().find(r => 
                (r.sourceId === sourceNode.id && r.targetId === targetNode.id) ||
                (r.sourceId === targetNode.id && r.targetId === sourceNode.id)
              )}
              <div 
                class="w-8 h-8 border border-gray-200 cursor-pointer hover:border-gray-400 transition-colors"
                class:bg-green-200={relationship?.strength === 'strong'}
                class:bg-blue-200={relationship?.strength === 'medium'}
                class:bg-yellow-200={relationship?.strength === 'weak'}
                class:bg-gray-200={relationship?.strength === 'very-weak'}
                title={relationship ? `${relationship.type} (${relationship.strength})` : 'No relationship'}
                role="button"
                tabindex="0"
                onclick={() => relationship && onRelationshipClick(relationship)}
                onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && relationship && onRelationshipClick(relationship)}
              >
                {#if relationship}
                  <div class="w-full h-full flex items-center justify-center text-xs font-bold">
                    {Math.round(relationship.confidence * 100)}
                  </div>
                {/if}
              </div>
            {/each}
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Legend -->
  <div class="mt-6 p-4 bg-gray-50 rounded-lg">
    <h4 class="text-sm font-medium text-gray-800 mb-3">Legend</h4>
    <div class="flex flex-wrap gap-4 text-sm">
      <div class="flex items-center gap-2">
        <div class="w-4 h-1 bg-green-500"></div>
        <span>Strong</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-1 bg-blue-500"></div>
        <span>Medium</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-1 bg-yellow-500"></div>
        <span>Weak</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-1 bg-gray-500"></div>
        <span>Very Weak</span>
      </div>
    </div>
  </div>

  <!-- Loading Overlay -->
  {#if isLoading}
    <div class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
      <LoadingSpinner />
    </div>
  {/if}
</div>

<style>
  .network-container {
    position: relative;
  }

  .relationship-dashboard {
    max-width: 100%;
  }

  @media (max-width: 768px) {
    .relationship-dashboard {
      padding: 1rem;
    }
    
    .grid {
      grid-template-columns: 1fr;
    }
    
    .network-container svg {
      height: 300px;
    }
  }
</style>