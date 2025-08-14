# Error Handling System Guide

This guide covers the comprehensive error handling system implemented in the Interactive Knowledge System. The system provides graceful error recovery, user-friendly error messages, and robust error boundaries for all components.

## Overview

The error handling system consists of several key components:

1. **ErrorHandler** - Core error handling utility
2. **Error Boundary Components** - React-style error boundaries for Svelte
3. **Service Wrappers** - Automatic error handling for service methods
4. **Toast System** - User-friendly error notifications
5. **Loading States** - Enhanced loading components with timeout handling

## Core Components

### ErrorHandler Utility

The `ErrorHandler` class provides centralized error handling for both synchronous and asynchronous operations.

```typescript
import { errorHandler } from '$lib/utils/errorHandler.js';

// Handle async operations
const result = await errorHandler.handleAsync(
  () => fetchData(),
  { operation: 'fetch-data', component: 'DataComponent' },
  {
    retryable: true,
    maxRetries: 3,
    showToast: true
  }
);

// Handle sync operations
const result = errorHandler.handleSync(
  () => processData(data),
  { operation: 'process-data', component: 'DataProcessor' },
  { fallbackValue: [] }
);
```

### Error Boundary Components

#### ErrorBoundary

Wraps components to catch and handle JavaScript errors gracefully.

```svelte
<script>
  import { ErrorBoundary } from '$lib/components';
</script>

<ErrorBoundary
  context={{ component: 'MyComponent', operation: 'render' }}
  showDetails={false}
  enableRetry={true}
>
  <MyComponent />
</ErrorBoundary>
```

#### AsyncWrapper

Handles async operations with loading states and error handling.

```svelte
<script>
  import { AsyncWrapper } from '$lib/components';

  async function loadData() {
    return await api.getData();
  }
</script>

<AsyncWrapper
  asyncOperation={loadData}
  context={{ operation: 'load-data', component: 'DataView' }}
  loadingMessage="Loading data..."
  retryable={true}
>
  {#snippet children(data)}
    <DataDisplay {data} />
  {/snippet}
</AsyncWrapper>
```

#### SafeComponent

Wraps any component with error boundaries and retry functionality.

```svelte
<script>
  import { SafeComponent } from '$lib/components';
  import MyComponent from './MyComponent.svelte';
</script>

<SafeComponent
  component={MyComponent}
  props={{ data: myData }}
  context={{ component: 'MyComponent' }}
  fallbackTitle="Component Error"
  enableRetry={true}
/>
```

### Service Error Wrappers

Automatically add error handling to service classes and methods.

```typescript
import { wrapService } from '$lib/utils/serviceErrorWrapper.js';

class DataService {
  async fetchData(id: string) {
    return await api.get(`/data/${id}`);
  }

  processData(data: any) {
    return data.map(item => transform(item));
  }
}

// Wrap the entire service
const safeDataService = wrapService(new DataService(), {
  serviceName: 'DataService',
  enableToasts: true,
  enableRetries: true
});

// Use wrapped service - errors are handled automatically
const data = await safeDataService.fetchData('123');
```

### Global Error Handler

Add to your app's root layout to handle global errors and show toast notifications.

```svelte
<!-- +layout.svelte -->
<script>
  import { GlobalErrorHandler } from '$lib/components';
</script>

<GlobalErrorHandler />

<main>
  <slot />
</main>
```

## Error Types and User Messages

The system automatically provides user-friendly error messages based on error types:

- **Network Errors**: "Unable to connect to the server. Please check your internet connection."
- **Timeout Errors**: "The operation took too long to complete. Please try again."
- **Validation Errors**: Uses the original error message or "Please check your input and try again."
- **Permission Errors**: "You do not have permission to perform this action."
- **Storage Errors**: "Unable to save data. Please check your storage space and try again."

## Configuration Options

### ErrorHandlingOptions

```typescript
interface ErrorHandlingOptions {
  showToast?: boolean; // Show toast notification (default: true)
  logError?: boolean; // Log error to console (default: true)
  fallbackValue?: any; // Return value on error (sync only)
  retryable?: boolean; // Enable retry functionality (default: false)
  maxRetries?: number; // Maximum retry attempts (default: 3)
  retryDelay?: number; // Delay between retries in ms (default: 1000)
  onError?: (error: Error, context: ErrorContext) => void;
  onRetry?: (attempt: number, error: Error) => void;
}
```

### ErrorContext

```typescript
interface ErrorContext {
  operation: string; // Name of the operation (e.g., 'fetch-data')
  component?: string; // Component name (e.g., 'DataComponent')
  userId?: string; // User ID for error tracking
  metadata?: Record<string, any>; // Additional context data
}
```

## Best Practices

### 1. Use Error Boundaries for Component Protection

Wrap components that might fail with ErrorBoundary:

```svelte
<ErrorBoundary context={{ component: 'ChartComponent' }}>
  <InteractiveChart data={chartData} />
</ErrorBoundary>
```

### 2. Handle Async Operations with AsyncWrapper

For components that load data asynchronously:

```svelte
<AsyncWrapper
  asyncOperation={() => loadUserData(userId)}
  context={{ operation: 'load-user', component: 'UserProfile' }}
>
  {#snippet children(userData)}
    <UserProfile user={userData} />
  {/snippet}
</AsyncWrapper>
```

### 3. Wrap Services for Automatic Error Handling

```typescript
// Create safe versions of services
const safeApiService = wrapService(apiService, {
  serviceName: 'ApiService',
  enableRetries: true,
  maxRetries: 3
});
```

### 4. Use Safe Storage Operations

```typescript
import { safeLocalStorage, safeIndexedDB } from '$lib/utils/serviceErrorWrapper.js';

// Safe localStorage operations
const value = safeLocalStorage.getItem('user-preferences');
safeLocalStorage.setItem('theme', 'dark');

// Safe IndexedDB operations
const data = await safeIndexedDB(() => database.get('users', userId), 'get-user-data');
```

### 5. Implement Loading States with Timeouts

```svelte
<LoadingFallback
  message="Loading user data..."
  timeout={30000}
  showProgress={true}
  progress={loadingProgress}
  onTimeout={() => showTimeoutMessage()}
/>
```

## Error Recovery Strategies

### 1. Graceful Degradation

Components should provide fallback UI when errors occur:

```svelte
<ErrorBoundary>
  {#snippet fallback()}
    <div class="fallback-ui">
      <p>Unable to load chart. Showing data table instead.</p>
      <DataTable {data} />
    </div>
  {/snippet}

  <InteractiveChart {data} />
</ErrorBoundary>
```

### 2. Retry Mechanisms

Enable retries for transient errors:

```typescript
const result = await errorHandler.handleAsync(
  () => api.fetchData(),
  { operation: 'fetch-data' },
  {
    retryable: true,
    maxRetries: 3,
    retryDelay: 1000
  }
);
```

### 3. User Feedback

Always provide clear feedback to users:

```svelte
<ErrorBoundary onError={error => showUserFriendlyMessage(error)} enableRetry={true}>
  <DataComponent />
</ErrorBoundary>
```

## Testing Error Handling

The system includes comprehensive tests for all error handling functionality:

```bash
npm test -- --run src/lib/tests/error-handling.test.ts
```

### Testing Your Components

```typescript
import { render, fireEvent } from '@testing-library/svelte';
import { vi } from 'vitest';
import MyComponent from './MyComponent.svelte';

test('handles errors gracefully', async () => {
  // Mock a failing operation
  const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
  global.fetch = mockFetch;

  const { getByText } = render(MyComponent);

  // Trigger the error
  await fireEvent.click(getByText('Load Data'));

  // Check that error UI is shown
  expect(getByText(/unable to connect/i)).toBeInTheDocument();
  expect(getByText('Try Again')).toBeInTheDocument();
});
```

## Debugging and Monitoring

### Development Mode

In development, the GlobalErrorHandler shows an error count indicator:

- Click the error badge to log error statistics to console
- Errors are logged with full stack traces
- Toast notifications show detailed error information

### Production Monitoring

The error handler can be extended to send errors to monitoring services:

```typescript
errorHandler.addErrorListener((error, context) => {
  // Send to error monitoring service
  errorMonitoringService.captureError(error, {
    context,
    user: getCurrentUser(),
    timestamp: new Date().toISOString()
  });
});
```

## Migration Guide

### Existing Components

To add error handling to existing components:

1. Wrap with ErrorBoundary:

```svelte
<ErrorBoundary context={{ component: 'ExistingComponent' }}>
  <ExistingComponent />
</ErrorBoundary>
```

2. Update async operations:

```typescript
// Before
try {
  const data = await api.fetchData();
  // handle success
} catch (error) {
  console.error(error);
  // handle error
}

// After
const result = await errorHandler.handleAsync(() => api.fetchData(), {
  operation: 'fetch-data',
  component: 'MyComponent'
});

if (result.success) {
  // handle success with result.data
}
```

3. Wrap services:

```typescript
// Before
const apiService = new ApiService();

// After
const apiService = wrapService(new ApiService(), {
  serviceName: 'ApiService',
  enableRetries: true
});
```

This comprehensive error handling system ensures that your application remains stable and provides excellent user experience even when errors occur.
