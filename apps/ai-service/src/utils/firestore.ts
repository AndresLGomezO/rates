import { Firestore } from '@google-cloud/firestore';
import { config } from '../config/index.js';

export const db = new Firestore({
  projectId: config.gcp.projectId,
  databaseId: '(default)',
});

if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(
    `🔥 [Firestore] Using Emulator at ${process.env.FIRESTORE_EMULATOR_HOST} for project ${config.gcp.projectId}`
  );
} else {
  console.log(`☁️ [Firestore] Using GCP Project ${config.gcp.projectId}`);
}

export const getCollectionName = (name: string) => {
  const prefix = config.firestore.collectionPrefix;
  if (!prefix) return name;
  return prefix.endsWith('_') ? `${prefix}${name}` : `${prefix}_${name}`;
};
