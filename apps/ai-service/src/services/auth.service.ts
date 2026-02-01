import { firebaseAuth } from '../utils/firebase.js';
import { UnauthorizedError } from '../utils/errors.js';

export class AuthService {
  async verifyToken(token: string): Promise<{ uid: string; email?: string }> {
    try {
      const decodedToken = await firebaseAuth.verifyIdToken(token);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };
    } catch {
      throw new UnauthorizedError('Invalid token');
    }
  }
}
