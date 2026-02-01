import { createServer } from './server.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

async function start() {
  try {
    const server = await createServer();

    // In Cloud Run, we listen on 0.0.0.0
    const address = await server.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    logger.info({ address, env: config.env }, 'Server started');

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.on(signal, () => {
        logger.info({ signal }, 'Received shutdown signal');
        server.close().then(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      });
    }
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();
