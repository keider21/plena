import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getDatabase, ref, set, get, update } from 'firebase/database';

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
    await signOut(auth);
    return { error: null };
  } catch (e) {
    return { error: e.message };
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
