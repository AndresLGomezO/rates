import { logger } from './logger.js';

let shutdownRequested = false;

export function registerShutdownHandler(cleanup: () => Promise<void>) {
  const signalHandler = async (signal: string) => {
    logger.warn({ signal }, 'Shutdown signal received');
    shutdownRequested = true;

    try {
      await cleanup();
    } catch (error) {
      logger.error({ error }, 'Error during shutdown cleanup');
    } finally {
      process.exit(1); // Exit with 1 to trigger retry/redelivery if appropriate
    }
  };

  process.on('SIGTERM', () => signalHandler('SIGTERM'));
  process.on('SIGINT', () => signalHandler('SIGINT'));
}

export function isShutdownRequested(): boolean {
  return shutdownRequested;
}
