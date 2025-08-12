/**
 * Simple logger that works in both browser and Node.js environments
 * In development, all log levels are shown
 * In production, only info, warn, and error logs are shown
 */
const is_development =
  // @ts-ignore - import.meta.env is defined by Vite
  (import.meta.env?.MODE && import.meta.env.MODE !== "production") ||
  // Fallback for Node.js environment
  (typeof process !== "undefined" && process.env?.NODE_ENV !== "production");
/**
 * Creates a logger instance with a given name
 * @param name Name to prefix log messages with
 */
export function createLogger(name: string) {
  const prefix = `[${name}]`;

  return {
    debug: (...args: unknown[]) => {
      if (is_development) {
        // eslint-disable-next-line no-console
        console.debug(prefix, ...args);
      }
    },
    info: (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.info(prefix, ...args);
    },
    warn: (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.warn(prefix, ...args);
    },
    error: (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.error(prefix, ...args);
    },
  };
}

// Default logger instance
export const logger = createLogger("app");

// Re-export the logger type for modules that need it
export type Logger = ReturnType<typeof createLogger>;
