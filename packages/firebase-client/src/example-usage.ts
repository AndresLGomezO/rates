/**
 * Example usage of @rates/firebase-client
 *
 * This file demonstrates how to use the Firebase client package
 * in your application. Copy patterns from here into your app.
 */

import { initializeFirebase, getAuth, getFirestore } from './index';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';

// ============================================================================
// 1. Initialize Firebase (do this once in your app entry point)
// ============================================================================

export function setupFirebase() {
  // Initialize Firebase - reads config from environment variables
  initializeFirebase();

  // Or provide custom config:
  // initializeFirebase({
  //   apiKey: 'your-api-key',
  //   authDomain: 'your-project.firebaseapp.com',
  //   projectId: 'your-project-id',
  //   storageBucket: 'your-project.appspot.com',
  //   messagingSenderId: 'your-sender-id',
  //   appId: 'your-app-id',
  // });
}

// ============================================================================
// 2. Authentication Examples
// ============================================================================

export async function loginUser(email: string, password: string) {
  const auth = getAuth();
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
}

export async function logoutUser() {
  const auth = getAuth();
  await signOut(auth);
}

// ============================================================================
// 3. Firestore Examples
// ============================================================================

export async function getUsers() {
  const firestore = getFirestore();
  const usersCollection = collection(firestore, 'users');
  const snapshot = await getDocs(usersCollection);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function getUserById(userId: string) {
  const firestore = getFirestore();
  const userDoc = doc(firestore, 'users', userId);
  const snapshot = await getDoc(userDoc);

  if (!snapshot.exists()) {
    throw new Error('User not found');
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function createUser(userData: Record<string, unknown>) {
  const firestore = getFirestore();
  const usersCollection = collection(firestore, 'users');
  const docRef = await addDoc(usersCollection, userData);
  return docRef.id;
}

// ============================================================================
// 4. Storage Examples (if needed)
// ============================================================================

// import { getStorage } from './index';
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
//
// export async function uploadFile(file: File, path: string) {
//   const storage = getStorage();
//   const storageRef = ref(storage, path);
//   await uploadBytes(storageRef, file);
//   return getDownloadURL(storageRef);
// }

// ============================================================================
// 5. Functions Examples (if needed)
// ============================================================================

// import { getFunctions } from './index';
// import { httpsCallable } from 'firebase/functions';
//
// export async function callCloudFunction(functionName: string, data: unknown) {
//   const functions = getFunctions();
//   const callable = httpsCallable(functions, functionName);
//   return callable(data);
// }
