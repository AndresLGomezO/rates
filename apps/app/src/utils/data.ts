/**
 * Recursively removes all keys with undefined values from an object.
 * Useful for Firestore which does not allow undefined values in documents.
 */
export const removeUndefined = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;

  const result = (Array.isArray(obj) ? [] : {}) as T;

  Object.keys(obj).forEach((key) => {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = removeUndefined(value);
    }
  });
  return result;
};
