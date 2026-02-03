import { FastifyInstance } from 'fastify';
import { documentController } from '../controllers/document.controller.js';

export async function documentRoutes(app: FastifyInstance) {
  app.post(
    '/v1/extract/document',
    documentController.extract.bind(documentController)
  );
}
