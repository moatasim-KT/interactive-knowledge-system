<script lang="ts">
  import { onMount } from 'svelte';
  import type { ProcessedDocument, KnowledgeNode } from '../types/index.js';
  import KnowledgeBaseIntegration from './KnowledgeBaseIntegration.svelte';
  import Card from './ui/Card.svelte';
  import Button from './ui/Button.svelte';
  import { logger } from '../utils/logger.js';

  // Example data
  let sampleDocument = $state<ProcessedDocument | null>(null);
  let existingNodes = $state<KnowledgeNode[]>([]);
  let createdNodes = $state<KnowledgeNode[]>([]);
  let allRelationships = $state<any[]>([]);

  onMount(() => {
    // Initialize with sample data
    initializeSampleData();
    logger.info('RelationshipSystemExample mounted');
  });

  function initializeSampleData() {
    // Create sample existing nodes
    existingNodes = [
      {
        id: 'node-1',
        title: 'Introduction to Machine Learning',
        type: 'article',
        metadata: {
          description: 'Basic concepts and fundamentals of machine learning',
          created: new Date('2024-01-15'),
          modified: new Date('2024-01-15'),
          version: 1,
          tags: ['machine learning', 'AI', 'basics', 'algorithms'],
          categories: ['technology', 'education'],
          difficulty: 'beginner',
          wordCount: 1200,
          readingTime: 6
        },
        created: new Date('2024-01-15'),
        modified: new Date('2024-01-15'),
        version: 1
      },
      {
        id: 'node-2',
        title: 'Deep Learning with Neural Networks',
        type: 'article',
        metadata: {
          description: 'Understanding neural networks and deep learning architectures',
          created: new Date('2024-01-20'),
          modified: new Date('2024-01-20'),
          version: 1,
          tags: ['deep learning', 'neural networks', 'AI', 'advanced'],
          categories: ['technology', 'science'],
          difficulty: 'advanced',
          wordCount: 2500,
          readingTime: 12
        },
        created: new Date('2024-01-20'),
        modified: new Date('2024-01-20'),
        version: 1
      },
      {
        id: 'node-3',
        title: 'Data Preprocessing Techniques',
        type: 'article',
        metadata: {
          description: 'Essential data cleaning and preprocessing methods',
          created: new Date('2024-01-10'),
          modified: new Date('2024-01-10'),
          version: 1,
          tags: ['data preprocessing', 'data cleaning', 'machine learning'],
          categories: ['technology', 'education'],
          difficulty: 'intermediate',
          wordCount: 1800,
          readingTime: 9
        },
        created: new Date('2024-01-10'),
        modified: new Date('2024-01-10'),
        version: 1
      }
    ];

    // Create sample document to integrate
    sampleDocument = {
      id: 'doc-sample-1',
      title: 'Supervised Learning Algorithms: A Comprehensive Guide',
      source: {
        type: 'manual',
        importedAt: new Date()
      },
      content: [
        {
          id: 'block-1',
          type: 'text',
          content: 'Supervised learning is a fundamental approach in machine learning where algorithms learn from labeled training data to make predictions on new, unseen data. This comprehensive guide covers the most important supervised learning algorithms including linear regression, decision trees, random forests, and support vector machines.',
          metadata: {
            created: new Date(),
            modified: new Date(),
            version: 1
          }
        },
        {
          id: 'block-2',
          type: 'text',
          content: 'Linear regression is one of the simplest and most widely used supervised learning algorithms. It assumes a linear relationship between input features and the target variable, making it highly interpretable and efficient for many real-world problems.',
          metadata: {
            created: new Date(),
            modified: new Date(),
            version: 1
          }
        },
        {
          id: 'block-3',
          type: 'code',
          content: `# Example: Linear Regression in Python
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
import numpy as np

# Generate sample data
X = np.random.randn(100, 1)
y = 2 * X.flatten() + 1 + np.random.randn(100) * 0.1

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Train model
model = LinearRegression()
model.fit(X_train, y_train)

# Make predictions
predictions = model.predict(X_test)`,
          metadata: {
            created: new Date(),
            modified: new Date(),
            version: 1
          }
        },
        {
          id: 'block-4',
          type: 'text',
          content: 'Decision trees provide a different approach to supervised learning by creating a tree-like model of decisions. They are highly interpretable and can handle both numerical and categorical features without requiring extensive data preprocessing.',
          metadata: {
            created: new Date(),
            modified: new Date(),
            version: 1
          }
        }
      ],
      metadata: {
        created: new Date(),
        modified: new Date(),
        version: 1,
        keywords: ['supervised learning', 'machine learning', 'algorithms', 'linear regression', 'decision trees', 'classification', 'regression'],
        author: 'AI Learning System',
        sourceUrl: 'https://example.com/supervised-learning-guide'
      },
      structure: {
        sections: [
          {
            id: 'section-1',
            title: 'Introduction to Supervised Learning',
            level: 1,
            content: [],
            subsections: []
          },
          {
            id: 'section-2',
            title: 'Linear Regression',
            level: 2,
            content: [],
            subsections: []
          },
          {
            id: 'section-3',
            title: 'Decision Trees',
            level: 2,
            content: [],
            subsections: []
          }
        ],
        toc: {
          items: [
            {
              id: 'toc-1',
              title: 'Introduction to Supervised Learning',
              level: 1,
              children: [
                {
                  id: 'toc-2',
                  title: 'Linear Regression',
                  level: 2,
                  children: []
                },
                {
                  id: 'toc-3',
                  title: 'Decision Trees',
                  level: 2,
                  children: []
                }
              ]
            }
          ]
        },
        metadata: {
          totalSections: 3,
          maxDepth: 2,
          hasImages: false,
          hasCode: true,
          hasTables: false
        }
      },
      assets: []
    };
  }

  function handleNodeCreated(node: KnowledgeNode) {
    createdNodes = [...createdNodes, node];
    logger.info('Node created in example', { nodeId: node.id, title: node.title });
  }

  function handleRelationshipCreated(relationship: any) {
    allRelationships = [...allRelationships, relationship];
    logger.info('Relationship created in example', { relationshipId: relationship.id });
  }

  function resetExample() {
    createdNodes = [];
    allRelationships = [];
    initializeSampleData();
  }
</script>

<div class="relationship-system-example p-6 space-y-6">
  <!-- Header -->
  <div class="text-center">
    <h1 class="text-2xl font-bold text-gray-900 mb-2">
      Knowledge Base Integration System Demo
    </h1>
    <p class="text-gray-600 max-w-2xl mx-auto">
      This example demonstrates how the knowledge base integration system automatically 
      detects relationships between content and creates connected knowledge nodes.
    </p>
  </div>

  <!-- Existing Knowledge Base -->
  <Card class="p-6">
    <h2 class="text-lg font-semibold text-gray-900 mb-4">Existing Knowledge Base</h2>
    <div class="grid gap-4 md:grid-cols-3">
      {#each existingNodes as node}
        <div class="p-4 border border-gray-200 rounded-lg">
          <h3 class="font-medium text-gray-900 mb-2">{node.title}</h3>
          <p class="text-sm text-gray-600 mb-3">{node.metadata?.description}</p>
          <div class="flex flex-wrap gap-1">
            {#each (node.metadata?.tags || []).slice(0, 3) as tag}
              <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                {tag}
              </span>
            {/each}
          </div>
          <div class="mt-2 text-xs text-gray-500">
            Difficulty: {node.metadata?.difficulty} • 
            {node.metadata?.readingTime} min read
          </div>
        </div>
      {/each}
    </div>
  </Card>

  <!-- Document to Integrate -->
  <Card class="p-6">
    <h2 class="text-lg font-semibold text-gray-900 mb-4">Document to Integrate</h2>
    {#if sampleDocument}
      <div class="border border-gray-200 rounded-lg p-4">
        <h3 class="font-medium text-gray-900 mb-2">{sampleDocument.title}</h3>
        <p class="text-sm text-gray-600 mb-3">
          {sampleDocument.content[0]?.content?.toString().substring(0, 200)}...
        </p>
        <div class="flex items-center gap-4 text-sm text-gray-600 mb-3">
          <span>Sections: {sampleDocument.structure.sections.length}</span>
          <span>Content Blocks: {sampleDocument.content.length}</span>
          <span>Has Code: {sampleDocument.structure.metadata.hasCode ? 'Yes' : 'No'}</span>
        </div>
        <div class="flex flex-wrap gap-1">
          {#each (sampleDocument.metadata.keywords || []).slice(0, 5) as keyword}
            <span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
              {keyword}
            </span>
          {/each}
        </div>
      </div>
    {/if}
  </Card>

  <!-- Integration Component -->
  <KnowledgeBaseIntegration
    document={sampleDocument}
    existingNodes={existingNodes}
    onNodeCreated={handleNodeCreated}
    onRelationshipCreated={handleRelationshipCreated}
  />

  <!-- Results -->
  {#if createdNodes.length > 0}
    <Card class="p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Integration Results</h2>
      
      <div class="space-y-4">
        <div>
          <h3 class="font-medium text-gray-800 mb-2">Created Nodes ({createdNodes.length})</h3>
          <div class="space-y-2">
            {#each createdNodes as node}
              <div class="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div class="flex items-start justify-between">
                  <div>
                    <h4 class="font-medium text-gray-900">{node.title}</h4>
                    <p class="text-sm text-gray-600 mt-1">{node.metadata?.description}</p>
                    <div class="flex items-center gap-4 text-xs text-gray-500 mt-2">
                      <span>Type: {node.type}</span>
                      <span>Interactivity: {node.interactivity}</span>
                      <span>Difficulty: {node.metadata?.difficulty}</span>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        {#if allRelationships.length > 0}
          <div>
            <h3 class="font-medium text-gray-800 mb-2">Created Relationships ({allRelationships.length})</h3>
            <div class="space-y-2">
              {#each allRelationships as relationship}
                <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="font-medium text-gray-900">
                        {existingNodes.find(n => n.id === relationship.targetId)?.title || 'Unknown Node'}
                      </span>
                      <span class="mx-2 text-gray-500">→</span>
                      <span class="text-sm text-gray-600">{relationship.type}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {relationship.strength}
                      </span>
                      <span class="text-xs text-gray-500">
                        {Math.round(relationship.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </Card>
  {/if}

  <!-- Reset Button -->
  <div class="text-center">
    <Button variant="outline" on:click={resetExample}>
      Reset Example
    </Button>
  </div>
</div>

<style>
  .relationship-system-example {
    max-width: 1200px;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .relationship-system-example {
      padding: 1rem;
    }
  }
</style>