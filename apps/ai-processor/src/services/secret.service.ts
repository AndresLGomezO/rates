import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class SecretService {
  private client: SecretManagerServiceClient;

  constructor() {
    this.client = new SecretManagerServiceClient();
  }

  async getSecret(name: string): Promise<string | null> {
    if (config.ENV === 'local') {
      logger.info(
        { name },
        'Local mode: skipping Secret Manager, checking env vars'
      );
      return process.env[name.toUpperCase()] || null;
    }

    try {
      const [version] = await this.client.accessSecretVersion({
        name: `projects/${config.GCP_PROJECT_ID}/secrets/${name}/versions/latest`,
      });

      const payload = version.payload?.data?.toString();
      return payload || null;
    } catch (error) {
      logger.error({ name, error }, 'Failed to access secret');
      return null;
    }
  }
}

export const secretService = new SecretService();
