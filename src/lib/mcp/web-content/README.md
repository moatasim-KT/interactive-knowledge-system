# Web Content Sourcing MCP Server

This directory contains the Model Context Protocol (MCP) server implementation for web content sourcing and processing automation. The MCP server provides automated tools for fetching, analyzing, and transforming web content into interactive learning materials.

## Overview

The Web Content MCP Server is designed to integrate seamlessly with the Interactive Knowledge System, providing automated content processing capabilities through a standardized protocol interface. It supports batch processing, interactive transformation, source management, and quality assessment.

## Architecture

### Core Components

1. **WebContentMcpEntrypoint** (`server.ts`)
   - Main MCP server entry point
   - Handles tool registration and execution
   - Manages process lifecycle and error handling

2. **WebContentMcpServer** (`web-content-mcp-server.ts`)
   - Svelte-integrated application server
   - Implements all MCP tools
   - Manages state integration with UI components

3. **Tool Categories**
   - **Content Fetching**: `fetchWebContent`, `batchImportUrls`
   - **Interactive Transformation**: `transformToInteractive`, `generateVisualization`
   - **Source Management**: `manageContentSources`, `validateContentQuality`
   - **Batch Processing**: `processBatchJob`, `monitorRSSFeed`
   - **Template & Assets**: `manageTemplates`, `optimizeAssets`

## Available Tools

### Content Fetching Tools

#### `fetchWebContent`
Fetches and extracts content from a web URL with enhanced processing.

**Parameters:**
- `url` (required): URL to fetch content from
- `options` (optional): Configuration options
  - `useHeadlessBrowser`: Use headless browser for JavaScript-heavy sites
  - `extractInteractive`: Extract interactive elements
  - `generateQuizzes`: Generate quiz content
  - `timeout`: Request timeout in milliseconds

**Example:**
```json
{
  "url": "https://example.com/article",
  "options": {
    "extractInteractive": true,
    "timeout": 30000
  }
}
```

#### `batchImportUrls`
Import multiple URLs in batch with processing queue.

**Parameters:**
- `urls` (required): Array of URLs to process
- `options` (optional): Batch processing options
  - `concurrency`: Number of concurrent requests
  - `extractInteractive`: Extract interactive elements
  - `generateQuizzes`: Generate quiz content

**Example:**
```json
{
  "urls": [
    "https://example.com/article1",
    "https://example.com/article2"
  ],
  "options": {
    "concurrency": 3,
    "extractInteractive": true
  }
}
```

### Interactive Transformation Tools

#### `transformToInteractive`
Transform static content into interactive visualizations.

**Parameters:**
- `contentId` (required): ID of content to transform
- `transformationType` (optional): Type of transformation
  - `auto`: Automatic detection
  - `visualization`: Create visualizations
  - `simulation`: Create simulations
  - `chart`: Create interactive charts
  - `quiz`: Generate quizzes
- `domain` (optional): Content domain for context

**Example:**
```json
{
  "contentId": "content_123",
  "transformationType": "auto",
  "domain": "machine-learning"
}
```

#### `generateVisualization`
Generate interactive visualization from content.

**Parameters:**
- `contentId` (required): ID of content to visualize
- `visualizationType` (optional): Type of visualization
  - `chart`: Data charts
  - `network`: Network diagrams
  - `timeline`: Timeline visualizations
  - `heatmap`: Heat maps
  - `neural-network`: Neural network diagrams
- `config` (optional): Visualization configuration

### Source Management Tools

#### `manageContentSources`
Manage imported content sources.

**Parameters:**
- `action` (required): Action to perform
  - `list`: List sources
  - `update`: Update source
  - `remove`: Remove source
  - `validate`: Validate sources
  - `health-check`: Perform health check
- `sourceId` (optional): Source ID for specific actions
- `filters` (optional): Filtering options

**Example:**
```json
{
  "action": "list",
  "filters": {
    "domain": "example.com",
    "status": "active"
  }
}
```

#### `validateContentQuality`
Validate and assess content quality.

**Parameters:**
- `contentId` (required): ID of content to validate
- `checks` (optional): Array of quality checks
  - `readability`: Check readability
  - `accessibility`: Check accessibility
  - `interactivity`: Check interactive potential
  - `accuracy`: Check content accuracy

### Batch Processing Tools

#### `processBatchJob`
Process batch content import and transformation job.

**Parameters:**
- `jobId` (required): Batch job ID to process
- `action` (required): Action to perform
  - `start`: Start job
  - `pause`: Pause job
  - `resume`: Resume job
  - `cancel`: Cancel job
  - `status`: Get job status

#### `monitorRSSFeed`
Monitor RSS feeds for new content.

**Parameters:**
- `feedUrl` (required): RSS feed URL
- `options` (optional): Monitoring options
  - `checkInterval`: Check interval in minutes
  - `maxItems`: Maximum items to process
  - `autoProcess`: Automatically process new items

### Template & Asset Tools

#### `manageTemplates`
Manage content transformation templates.

**Parameters:**
- `action` (required): Action to perform
  - `list`: List templates
  - `create`: Create template
  - `update`: Update template
  - `delete`: Delete template
  - `apply`: Apply template
- `templateId` (optional): Template ID for specific actions
- `templateData` (optional): Template data for create/update

#### `optimizeAssets`
Optimize and manage content assets.

**Parameters:**
- `contentId` (required): Content ID to optimize assets for
- `options` (optional): Optimization options
  - `compressImages`: Compress images
  - `minifyCode`: Minify code
  - `optimizeForMobile`: Optimize for mobile

## Integration with Svelte Components

The MCP server is designed to integrate seamlessly with Svelte components through the `webContentState` store:

### State Updates
- **Content Processing**: Updates processing status and progress
- **Batch Operations**: Manages batch job state and progress
- **Notifications**: Provides user feedback through notifications
- **Source Management**: Updates source lists and metadata

### Real-time Updates
The server provides real-time updates to the UI through:
- Progress indicators during content fetching
- Batch processing status updates
- Error notifications with recovery suggestions
- Success confirmations with actionable results

## Error Handling

The MCP server includes comprehensive error handling:

### Error Categories
- **Network Errors**: Connection failures, timeouts
- **Content Errors**: Extraction failures, invalid content
- **Validation Errors**: Invalid URLs, missing parameters
- **Processing Errors**: Transformation failures, analysis errors

### Recovery Strategies
- **Automatic Retry**: For transient network issues
- **Fallback Methods**: Alternative extraction techniques
- **User Guidance**: Clear error messages with suggestions
- **Graceful Degradation**: Partial results when possible

## Testing

### Unit Tests
Run the integration tests to verify MCP server functionality:

```bash
npx vitest run src/lib/mcp/web-content/__tests__/mcp-server-integration.test.ts
```

### Manual Testing
Use the test scripts to verify server functionality:

```bash
# Test server initialization and tools
npx vitest run src/lib/mcp/web-content/test-mcp-server.ts

# Test individual tool execution
npx vitest run src/lib/mcp/web-content/test-tools-only.ts
```

## Configuration

### Server Options
The MCP server can be configured with various options:

```typescript
const server = new WebContentMcpEntrypoint({
  // Server configuration options
  timeout: 30000,
  maxConcurrentRequests: 5,
  enableDetailedLogging: true
});
```

### Tool Configuration
Individual tools can be configured through their parameters:

```typescript
// Example: Configure batch processing
const batchOptions = {
  concurrency: 3,
  extractInteractive: true,
  generateQuizzes: false,
  timeout: 30000
};
```

## Deployment

### Development
For development, the server can be started directly:

```bash
node src/lib/mcp/web-content/server.ts
```

### Production
For production deployment, use the built server:

```bash
npm run build
node dist/lib/mcp/web-content/server.js
```

### Docker
A Docker container can be used for isolated deployment:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
CMD ["node", "dist/lib/mcp/web-content/server.js"]
```

## Monitoring

### Logging
The server provides structured logging for monitoring:

```typescript
import { createLogger } from '../../utils/logger.js';
const logger = createLogger('mcp:web-content');
```

### Metrics
Key metrics to monitor:
- Tool execution success rate
- Average processing time
- Error frequency by type
- Batch job completion rate
- Content quality scores

### Health Checks
The server includes health check endpoints:
- Tool availability
- Service dependencies
- Resource utilization
- Error rates

## Troubleshooting

### Common Issues

1. **Tool Registration Failures**
   - Check service dependencies
   - Verify import paths
   - Review error logs

2. **Content Fetching Errors**
   - Verify URL accessibility
   - Check network connectivity
   - Review timeout settings

3. **Batch Processing Issues**
   - Monitor concurrency limits
   - Check memory usage
   - Review error patterns

4. **Integration Problems**
   - Verify Svelte store integration
   - Check component imports
   - Review state updates

### Debug Mode
Enable debug logging for detailed troubleshooting:

```typescript
const server = new WebContentMcpServer();
server.initialize();
// Debug logs will show detailed execution information
```

## Contributing

When contributing to the MCP server:

1. **Follow TypeScript Standards**: Use proper typing and interfaces
2. **Add Tests**: Include unit tests for new tools
3. **Update Documentation**: Keep this README current
4. **Error Handling**: Implement comprehensive error handling
5. **Logging**: Add appropriate logging for debugging

## License

This MCP server implementation is part of the Interactive Knowledge System and follows the same licensing terms.