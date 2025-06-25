/**
 * Simple logging utility for MCP server
 * Using console.log for better visibility in Vercel logs
 */
export const log = (message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [EXA-MCP] ${message}`);
};

export const createRequestLogger = (requestId: string, toolName: string) => {
  const startTime = Date.now();
  
  return {
    log: (message: string, data?: any): void => {
      if (data) {
        log(`[${requestId}] [${toolName}] ${message} - ${JSON.stringify(data)}`);
      } else {
        log(`[${requestId}] [${toolName}] ${message}`);
      }
    },
    start: (query: string): void => {
      log(`[${requestId}] [${toolName}] START - Query: "${query}"`);
    },
    error: (error: unknown): void => {
      const errorDetails = error instanceof Error ? {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join(' | ')
      } : { error: String(error) };
      log(`[${requestId}] [${toolName}] ERROR - ${JSON.stringify(errorDetails)}`);
    },
    complete: (resultCount?: number): void => {
      const duration = Date.now() - startTime;
      const resultInfo = resultCount !== undefined ? ` - Results: ${resultCount}` : '';
      log(`[${requestId}] [${toolName}] COMPLETE - Duration: ${duration}ms${resultInfo}`);
    }
  };
}; 