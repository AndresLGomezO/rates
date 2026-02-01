import { Firestore } from '@google-cloud/firestore';
import { config } from '../config/index.js';

export const db = new Firestore({
  projectId: config.gcp.projectId,
  databaseId: '(default)', // Explicitly set default database
});

export const getCollectionName = (name: string) =>
  `${config.firestore.collectionPrefix}_${name}`;
