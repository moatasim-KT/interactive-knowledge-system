# MCP Server Documentation

## Overview

The Interactive Knowledge System includes a built-in MCP (Model Context Protocol) server for web content sourcing and processing. This server provides tools for fetching, analyzing, and integrating web content into your knowledge base.

## Architecture

### MCP Server Components

```
MCP Server/
├── Web Content Tools/
│   ├── Content Fetcher
│   ├── Content Extractor
│   ├── Content Analyzer
│   └── Source Manager
├── Processing Pipeline/
│   ├── Content Parser
│   ├── Metadata Extractor
│   └── Content Transformer
└── Integration Layer/
    ├── Knowledge System Bridge
    ├── Storage Interface
    └── API Endpoints
```

### Server Configuration

#### Basic Configuration

```json
{
  "mcpServers": {
    "web-content": {
      "command": "node",
      "args": ["src/lib/mcp/web-content/server.js"],
      "env": {
        "NODE_ENV": "production",
        "MCP_SERVER_PORT": "3001",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

#### Advanced Configuration

```json
{
  "mcpServers": {
    "web-content": {
      "command": "node",
      "args": ["src/lib/mcp/web-content/server.js"],
      "env": {
        "NODE_ENV": "production",
        "MCP_SERVER_PORT": "3001",
        "LOG_LEVEL": "debug",
        "ENABLE_HEADLESS_BROWSER": "true",
        "MAX_CONCURRENT_REQUESTS": "5",
        "REQUEST_TIMEOUT": "30000",
        "CACHE_TTL": "3600"
      },
      "timeout": 60000,
      "retries": 3
    }
  }
}
```

## Available Tools

### fetchWebContent

Fetch and extract content from web URLs with advanced processing options.

#### Parameters

```typescript
interface FetchWebContentParams {
  url: string;
  options?: {
    useHeadlessBrowser?: boolean;
    timeout?: number;
    userAgent?: string;
    followRedirects?: boolean;
    maxRedirects?: number;
    mainContentOnly?: boolean;
    includeImages?: boolean;
    includeLinks?: boolean;
    includeMetadata?: boolean;
    includeStructuredData?: boolean;
  };
}
```

#### Usage Example

```javascript
const result = await mcpClient.callTool('fetchWebContent', {
  url: 'https://example.com/article',
  options: {
    mainContentOnly: true,
    includeImages: true,
    includeMetadata: true,
    timeout: 30000
  }
});
```

#### Response Format

```typescript
interface WebContentResponse {
  success: boolean;
  data?: {
    id: string;
    metadata: WebContentMetadata;
    text: string;
    html: string;
    blocks: ContentBlock[];
    headers: Record<string, string>;
    statusCode: number;
    fetchedAt: string;
    processingTime: number;
  };
  error?: string;
}
```

### processContent

Transform and analyze extracted content for integration into the knowledge system.

#### Parameters

```typescript
interface ProcessContentParams {
  content: string;
  contentType: 'html' | 'markdown' | 'text';
  options?: {
    extractSummary?: boolean;
    generateTags?: boolean;
    analyzeReadability?: boolean;
    detectLanguage?: boolean;
    extractKeywords?: boolean;
    createBlocks?: boolean;
  };
}
```

#### Usage Example

```javascript
const processed = await mcpClient.callTool('processContent', {
  content: htmlContent,
  contentType: 'html',
  options: {
    extractSummary: true,
    generateTags: true,
    createBlocks: true
  }
});
```

### manageSource

Manage content sources and libraries for organized content sourcing.

#### Parameters

```typescript
interface ManageSourceParams {
  action: 'add' | 'remove' | 'update' | 'list';
  source?: {
    id?: string;
    name: string;
    url: string;
    type: 'website' | 'blog' | 'documentation' | 'news';
    schedule?: string; // cron expression
    filters?: string[];
  };
}
```

#### Usage Example

```javascript
// Add a new source
await mcpClient.callTool('manageSource', {
  action: 'add',
  source: {
    name: 'Tech Blog',
    url: 'https://techblog.example.com',
    type: 'blog',
    schedule: '0 9 * * *', // Daily at 9 AM
    filters: ['technology', 'programming']
  }
});

// List all sources
const sources = await mcpClient.callTool('manageSource', {
  action: 'list'
});
```

### batchProcess

Process multiple URLs or content items in batch for efficient content sourcing.

#### Parameters

```typescript
interface BatchProcessParams {
  items: Array<{
    url?: string;
    content?: string;
    id: string;
  }>;
  options?: {
    concurrency?: number;
    retryAttempts?: number;
    failFast?: boolean;
    progressCallback?: boolean;
  };
}
```

#### Usage Example

```javascript
const batchResult = await mcpClient.callTool('batchProcess', {
  items: [
    { id: 'item1', url: 'https://example1.com' },
    { id: 'item2', url: 'https://example2.com' },
    { id: 'item3', url: 'https://example3.com' }
  ],
  options: {
    concurrency: 3,
    retryAttempts: 2,
    progressCallback: true
  }
});
```

## Content Extraction

### Supported Content Types

#### Web Pages

- HTML articles and blog posts
- Documentation pages
- News articles
- Academic papers
- Tutorial content

#### Structured Data

- JSON-LD markup
- Microdata
- RDFa annotations
- Open Graph metadata
- Twitter Cards

#### Media Content

- Images with alt text and captions
- Videos with transcripts
- Audio content descriptions
- Interactive elements

### Extraction Strategies

#### Main Content Detection

```javascript
const extractionConfig = {
  selectors: {
    title: 'h1, .title, .headline',
    content: 'article, .content, .post-body',
    author: '.author, .byline, [rel="author"]',
    date: '.date, .published, time[datetime]'
  },
  removeElements: ['.advertisement', '.sidebar', '.navigation', '.footer'],
  preserveElements: ['code', 'pre', 'blockquote', 'table']
};
```

#### Content Cleaning

- Remove advertisements and navigation
- Preserve semantic markup
- Clean up formatting inconsistencies
- Extract and validate links
- Optimize images and media

## Integration Patterns

### Direct Integration

```javascript
import { webContentMcpServer } from '$lib/mcp/web-content';

// Direct tool execution
async function fetchAndIntegrateContent(url) {
  try {
    const result = await webContentMcpServer.executeTool('fetchWebContent', {
      url,
      options: { mainContentOnly: true }
    });

    if (result.success) {
      // Process and store content
      await contentStorage.save(result.data);
      await searchEngine.index(result.data);
    }
  } catch (error) {
    console.error('Content integration failed:', error);
  }
}
```

### Workflow Integration

```javascript
// Automated content workflow
class ContentWorkflow {
  async processWebSource(sourceConfig) {
    // 1. Fetch content
    const content = await this.fetchContent(sourceConfig.url);

    // 2. Process and analyze
    const processed = await this.processContent(content);

    // 3. Create knowledge blocks
    const blocks = await this.createContentBlocks(processed);

    // 4. Integrate into knowledge system
    await this.integrateContent(blocks, sourceConfig);

    // 5. Update source metadata
    await this.updateSourceMetadata(sourceConfig.id, {
      lastProcessed: new Date(),
      itemsProcessed: blocks.length
    });
  }
}
```

### Scheduled Processing

```javascript
// Cron-based content processing
import { CronJob } from 'cron';

const contentProcessor = new CronJob('0 */6 * * *', async () => {
  const sources = await sourceManager.getActiveSources();

  for (const source of sources) {
    try {
      await processSourceContent(source);
    } catch (error) {
      logger.error(`Failed to process source ${source.id}:`, error);
    }
  }
});

contentProcessor.start();
```

## Error Handling

### Error Types

#### Network Errors

```javascript
{
  type: 'NetworkError',
  code: 'TIMEOUT',
  message: 'Request timeout after 30000ms',
  url: 'https://example.com',
  retryable: true
}
```

#### Content Errors

```javascript
{
  type: 'ContentError',
  code: 'EXTRACTION_FAILED',
  message: 'Unable to extract main content',
  url: 'https://example.com',
  retryable: false
}
```

#### Rate Limiting

```javascript
{
  type: 'RateLimitError',
  code: 'RATE_LIMITED',
  message: 'Rate limit exceeded',
  retryAfter: 3600,
  retryable: true
}
```

### Error Recovery

```javascript
class ErrorRecoveryHandler {
  async handleError(error, context) {
    switch (error.type) {
      case 'NetworkError':
        return this.handleNetworkError(error, context);
      case 'ContentError':
        return this.handleContentError(error, context);
      case 'RateLimitError':
        return this.handleRateLimit(error, context);
      default:
        return this.handleGenericError(error, context);
    }
  }

  async handleNetworkError(error, context) {
    if (error.retryable && context.retryCount < 3) {
      const delay = Math.pow(2, context.retryCount) * 1000;
      await this.delay(delay);
      return { retry: true, delay };
    }
    return { retry: false, fallback: 'cache' };
  }
}
```

## Performance Optimization

### Caching Strategies

#### Content Caching

```javascript
const cacheConfig = {
  ttl: 3600, // 1 hour
  maxSize: 1000, // Max cached items
  strategy: 'lru', // Least recently used
  compression: true,
  encryption: false
};
```

#### Request Deduplication

```javascript
class RequestDeduplicator {
  private pending = new Map();

  async fetch(url, options) {
    const key = this.createKey(url, options);

    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    const promise = this.performFetch(url, options);
    this.pending.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pending.delete(key);
    }
  }
}
```

### Concurrent Processing

```javascript
// Limit concurrent requests
const semaphore = new Semaphore(5); // Max 5 concurrent requests

async function processUrls(urls) {
  const results = await Promise.allSettled(
    urls.map(url =>
      semaphore.acquire().then(async release => {
        try {
          return await fetchContent(url);
        } finally {
          release();
        }
      })
    )
  );

  return results;
}
```

## Monitoring and Analytics

### Performance Metrics

```javascript
const metrics = {
  requestsPerMinute: 45,
  averageResponseTime: 2500, // ms
  successRate: 0.95,
  cacheHitRate: 0.78,
  errorRate: 0.05,
  activeConnections: 12
};
```

### Health Checks

```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: getActiveConnections(),
    lastError: getLastError()
  };

  res.json(health);
});
```

### Logging

```javascript
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('mcp-server');

// Structured logging
logger.info('Content fetched successfully', {
  url: 'https://example.com',
  duration: 2500,
  size: 45000,
  contentType: 'text/html'
});

logger.error('Content fetch failed', {
  url: 'https://example.com',
  error: error.message,
  statusCode: 404,
  retryCount: 2
});
```

## Security Considerations

### URL Validation

```javascript
function validateUrl(url) {
  try {
    const parsed = new URL(url);

    // Check protocol
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }

    // Check for private IPs
    if (isPrivateIP(parsed.hostname)) {
      throw new Error('Private IP not allowed');
    }

    // Check domain whitelist
    if (!isDomainAllowed(parsed.hostname)) {
      throw new Error('Domain not whitelisted');
    }

    return true;
  } catch (error) {
    throw new Error(`Invalid URL: ${error.message}`);
  }
}
```

### Content Sanitization

```javascript
import DOMPurify from 'dompurify';

function sanitizeContent(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'a',
      'strong',
      'em',
      'code',
      'pre'
    ],
    ALLOWED_ATTR: ['href', 'title', 'alt', 'src'],
    ALLOW_DATA_ATTR: false
  });
}
```

### Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);
```

## Deployment

### Docker Configuration

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY .env ./

EXPOSE 3001

CMD ["node", "src/lib/mcp/web-content/server.js"]
```

### Environment Variables

```bash
# Server Configuration
MCP_SERVER_PORT=3001
NODE_ENV=production
LOG_LEVEL=info

# Content Processing
ENABLE_HEADLESS_BROWSER=true
MAX_CONCURRENT_REQUESTS=5
REQUEST_TIMEOUT=30000
CACHE_TTL=3600

# Security
ALLOWED_DOMAINS=example.com,trusted-site.org
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Storage
CONTENT_STORAGE_PATH=/data/content
CACHE_STORAGE_PATH=/data/cache
```

### Production Deployment

```yaml
# docker-compose.yml
version: '3.8'
services:
  mcp-server:
    build: .
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=production
      - MCP_SERVER_PORT=3001
    volumes:
      - ./data:/data
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3001/health']
      interval: 30s
      timeout: 10s
      retries: 3
```

## Troubleshooting

### Common Issues

#### Server Won't Start

1. Check port availability
2. Verify environment variables
3. Check file permissions
4. Review error logs

#### Content Extraction Fails

1. Verify URL accessibility
2. Check content structure
3. Review extraction selectors
4. Test with different user agents

#### Performance Issues

1. Monitor memory usage
2. Check concurrent request limits
3. Review caching configuration
4. Optimize extraction selectors

### Debug Mode

```bash
# Enable debug logging
DEBUG=mcp:* npm run dev

# Verbose logging
LOG_LEVEL=debug npm start
```

### Support Resources

- Server logs: `/logs/mcp-server.log`
- Health endpoint: `http://localhost:3001/health`
- Metrics endpoint: `http://localhost:3001/metrics`
- Documentation: `/docs/mcp-server.md`
