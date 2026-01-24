import { FirebaseError } from 'firebase/app';

const errorMessages: Record<string, string> = {
  'auth/invalid-email': 'The email address is not valid.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'That email is already registered.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/too-many-requests':
    'Too many attempts. Please wait a moment and try again.',
};

export function getFriendlyError(error: unknown): string {
  if (error instanceof FirebaseError) {
    return errorMessages[error.code] ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
