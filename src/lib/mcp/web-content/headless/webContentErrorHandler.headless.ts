/** Headless no-op error handler for MCP server runtime (Node). */

export const webContentErrorHandlerHeadless = {
  handleError(_error: any, _context: string, _operation: string) {
    return {
      code: 'HEADLESS_NOOP',
      message: 'Handled in headless mode',
      recoverable: false,
      retryable: false,
      userMessage: 'An error occurred (headless mode)'
    };
  }
};


