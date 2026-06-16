import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { getDatabase, ref, set, get, update } from 'firebase/database';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const firebaseConfig = {
  apiKey: 'AIzaSyCNUTVXgeYrZUyA264YRIwF2G2ZE2IPdrg',
  authDomain: 'vidaple.firebaseapp.com',
  databaseURL: 'https://vidaple-default-rtdb.firebaseio.com',
  projectId: 'vidaple',
  storageBucket: 'vidaple.firebasestorage.app',
  messagingSenderId: '155946404852',
  appId: '1:155946404852:web:d2b2e1b1f083fff36287a1',
  measurementId: 'G-9HX1YQDF2W',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// ─── EMAIL/PASSWORD AUTH ──────────────────
export async function firebaseRegister(email, password) {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    return { user: userCred.user, error: null };
  } catch (e) {
    return { user: null, error: e.message };
  }
}

export async function firebaseLogin(email, password) {
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCred.user, error: null };
  } catch (e) {
    return { user: null, error: e.message };
  }
}


export async function firebaseLogout() {
  try {
    try { await GoogleSignin.signOut(); } catch (_) {}
    await signOut(auth);
    return { error: null };
  } catch (e) {
    return { error: e.message };
  }
}

// ─── GOOGLE AUTH (MODERN) ─────────────────
export async function initializeGoogleSignIn() {
  try {
    GoogleSignin.configure({
      webClientId: '155946404852-9k81ndpo3m2afg119fqkl3fn8b724qae.apps.googleusercontent.com',
    });
  } catch (e) {
    console.log('GoogleSignin init error:', e);
  }
}

export async function firebaseLoginGoogle() {
  try {
    await GoogleSignin.hasPlayServices();
    try { await GoogleSignin.signOut(); } catch (_) {}
    const userInfo = await GoogleSignin.signIn();
    if (userInfo.type !== 'success') {
      return { user: null, error: 'Google Sign-In cancelado' };
    }
    const credential = GoogleAuthProvider.credential(userInfo.data.idToken);
    const userCred = await signInWithCredential(auth, credential);
    return { user: userCred.user, error: null };
  } catch (e) {
    return { user: null, error: e.message };
  }
}

// ─── SYNC DATA ────────────────────────────
export async function syncToFirebase(userId, dataKey, data) {
  try {
    await set(ref(db, `users/${userId}/${dataKey}`), data);
    return { error: null };
  } catch (e) {
    return { error: e.message };
  }
}

export async function syncFromFirebase(userId, dataKey) {
  try {
    const snapshot = await get(ref(db, `users/${userId}/${dataKey}`));
    return { data: snapshot.val(), error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

export async function updateFirebase(userId, updates) {
  try {
    await update(ref(db, `users/${userId}`), updates);
    return { error: null };
  } catch (e) {
    return { error: e.message };
  }
}

// ─── APP VERSION CHECK ────────────────────
export async function checkLatestVersion() {
  try {
    const snapshot = await get(ref(db, 'app/version'));
    return { version: snapshot.val(), error: null };
  } catch (e) {
    return { version: null, error: e.message };
  }
}
