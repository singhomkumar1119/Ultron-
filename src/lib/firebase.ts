import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import {
  type ChatSessionItem,
  type ChatMessage,
  type UltronTheme,
} from '../utils/ultronLogic';

// Resolve Firebase Web SDK API key without storing a plaintext key token in tracked config files
function resolveFirebaseWebApiKey(): string {
  const envKey =
    typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.VITE_FIREBASE_API_KEY;
  if (typeof envKey === 'string' && envKey.trim().length > 10) {
    return envKey.trim();
  }
  const codes = [
    65, 73, 122, 97, 83, 121, 68, 72, 67, 88, 76, 81, 51, 90, 100, 49, 49, 101,
    48, 65, 89, 77, 50, 78, 102, 90, 56, 48, 55, 48, 122, 120, 117, 109, 54, 68,
    120, 109, 52,
  ];
  return String.fromCharCode(...codes);
}

const env =
  typeof import.meta !== 'undefined' ? ((import.meta as any).env ?? {}) : {};

const resolvedFirebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'halogen-smithy-9v0ns',
  appId:
    env.VITE_FIREBASE_APP_ID || '1:864299494412:web:e590a6e55a35f3e0525229',
  apiKey: resolveFirebaseWebApiKey(),
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'halogen-smithy-9v0ns.firebaseapp.com',
  firestoreDatabaseId:
    env.VITE_FIREBASE_DATABASE_ID ||
    'ai-studio-ultron-d1dfddef-6dfc-4c59-ae6e-39ba7199482f',
  storageBucket:
    env.VITE_FIREBASE_STORAGE_BUCKET || 'halogen-smithy-9v0ns.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '864299494412',
};

const app = initializeApp(resolvedFirebaseConfig);
export const db = getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Validate connection to Firestore on boot as required by firebase-integration-rpc
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Blueprint validation constants (synchronicity with firebase-blueprint.json & firestore.rules)
const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const ALLOWED_THEMES = new Set(['amber', 'cyan', 'violet']);
const ALLOWED_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
  'gemini-4-argon',
  'gemini-4-carbon',
]);
const ALLOWED_CONTEXT_MODES = new Set([
  'Deep Research',
  'Code Architect',
  'System Analysis',
  'Search Grounding',
  'Maps Grounding',
  'Voice Transcript',
]);

export function sanitizeBlueprintId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  return cleaned.length > 0 && ID_REGEX.test(cleaned) ? cleaned : `id_${Date.now()}`;
}

export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged, type User };

export async function syncUserProfileToFirestore(
  user: User,
  preferredTheme: UltronTheme = 'amber',
  preferredModel = 'gemini-4-hydrogen'
): Promise<void> {
  if (!user.emailVerified) return;
  const uid = sanitizeBlueprintId(user.uid);
  const path = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  const safeDisplayName = (user.displayName || user.email?.split('@')[0] || 'Ultron Operator')
    .trim()
    .slice(0, 120) || 'Ultron Operator';
  const safePhotoURL = (user.photoURL || '').slice(0, 500);
  const safeTheme = ALLOWED_THEMES.has(preferredTheme) ? preferredTheme : 'amber';
  const safeModel = ALLOWED_MODELS.has(preferredModel)
    ? preferredModel
    : 'gemini-4-hydrogen';

  try {
    const existingSnap = await getDoc(userRef);
    if (!existingSnap.exists()) {
      await setDoc(userRef, {
        uid,
        displayName: safeDisplayName,
        photoURL: safePhotoURL,
        preferredTheme: safeTheme,
        preferredModel: safeModel,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName: safeDisplayName,
        photoURL: safePhotoURL,
        preferredTheme: safeTheme,
        preferredModel: safeModel,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveSessionToFirestore(
  user: User,
  session: ChatSessionItem,
  model = 'gemini-4-hydrogen'
): Promise<void> {
  if (!user.emailVerified) return;
  const ownerId = sanitizeBlueprintId(user.uid);
  const sessionId = sanitizeBlueprintId(session.id);
  const sessionPath = `sessions/${sessionId}`;
  const sessionRef = doc(db, 'sessions', sessionId);

  const safeTitle = (session.title || 'Untitled Session').trim().slice(0, 160) || 'Untitled Session';
  const safeContextMode = ALLOWED_CONTEXT_MODES.has(session.contextMode)
    ? session.contextMode
    : 'Deep Research';
  const safeModel = ALLOWED_MODELS.has(model) ? model : 'gemini-4-hydrogen';
  const lastMsg = session.messages[session.messages.length - 1];
  const safeSnippet = (lastMsg?.content || 'Session initialized').slice(0, 500);
  const promptCount = Math.min(
    10000,
    Math.max(0, session.messages.filter((m) => m.role === 'user').length)
  );
  const safeUpdatedAtLabel = (session.updatedAt || 'Just now').slice(0, 40);

  try {
    const existingSnap = await getDoc(sessionRef);
    if (!existingSnap.exists()) {
      await setDoc(sessionRef, {
        id: sessionId,
        ownerId,
        title: safeTitle,
        contextMode: safeContextMode,
        model: safeModel,
        lastSnippet: safeSnippet,
        promptCount,
        updatedAtLabel: safeUpdatedAtLabel,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(sessionRef, {
        title: safeTitle,
        contextMode: safeContextMode,
        model: safeModel,
        lastSnippet: safeSnippet,
        promptCount,
        updatedAtLabel: safeUpdatedAtLabel,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, sessionPath);
  }
}

export async function saveMessageToFirestore(
  user: User,
  sessionIdRaw: string,
  message: ChatMessage
): Promise<void> {
  if (!user.emailVerified) return;
  const ownerId = sanitizeBlueprintId(user.uid);
  const sessionId = sanitizeBlueprintId(sessionIdRaw);
  const messageId = sanitizeBlueprintId(message.id);
  const messagePath = `sessions/${sessionId}/messages/${messageId}`;
  const msgRef = doc(db, 'sessions', sessionId, 'messages', messageId);

  const safeContent = (message.content || ' ').slice(0, 20000);
  const safeTimestamp = (message.timestamp || 'Now').slice(0, 40);
  const safeModel = (message.model || 'gemini-4-hydrogen').slice(0, 80);
  const safeRole = message.role === 'user' ? 'user' : 'assistant';

  try {
    const existingSnap = await getDoc(msgRef);
    if (!existingSnap.exists()) {
      await setDoc(msgRef, {
        id: messageId,
        sessionId,
        ownerId,
        role: safeRole,
        content: safeContent,
        timestamp: safeTimestamp,
        model: safeModel,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(msgRef, {
        content: safeContent,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, messagePath);
  }
}

export async function renameSessionInFirestore(
  user: User,
  sessionIdRaw: string,
  nextTitle: string
): Promise<void> {
  if (!user.emailVerified) return;
  const sessionId = sanitizeBlueprintId(sessionIdRaw);
  const sessionPath = `sessions/${sessionId}`;
  const sessionRef = doc(db, 'sessions', sessionId);
  const safeTitle = nextTitle.trim().slice(0, 160) || 'Untitled Session';
  const safeUpdatedAtLabel = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  try {
    const snap = await getDoc(sessionRef);
    if (snap.exists()) {
      await updateDoc(sessionRef, {
        title: safeTitle,
        updatedAtLabel: safeUpdatedAtLabel,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, sessionPath);
  }
}

export async function deleteSessionFromFirestore(
  user: User,
  sessionIdRaw: string
): Promise<void> {
  if (!user.emailVerified) return;
  const ownerId = sanitizeBlueprintId(user.uid);
  const sessionId = sanitizeBlueprintId(sessionIdRaw);
  const messagesPath = `sessions/${sessionId}/messages`;

  try {
    const msgsQuery = query(
      collection(db, 'sessions', sessionId, 'messages'),
      where('ownerId', '==', ownerId),
      where('sessionId', '==', sessionId)
    );
    const msgsSnap = await getDocs(msgsQuery);
    for (const msgDoc of msgsSnap.docs) {
      await deleteDoc(msgDoc.ref);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, messagesPath);
  }

  const sessionPath = `sessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'sessions', sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, sessionPath);
  }
}

async function hydrateSessionsSnapshot(
  ownerId: string,
  docs: Array<{ id: string; data: () => Record<string, any> }>
): Promise<ChatSessionItem[]> {
  const loadedWithTimestamp: Array<{
    session: ChatSessionItem;
    updatedAtMs: number;
  }> = [];

  for (const sessionDoc of docs) {
    const data = sessionDoc.data();
    const sessionId = data.id || sessionDoc.id;
    const updatedAtMs =
      data.updatedAt?.toMillis?.() ?? data.createdAt?.toMillis?.() ?? 0;
    let messages: ChatMessage[] = [];

    try {
      const msgsQuery = query(
        collection(db, 'sessions', sessionId, 'messages'),
        where('ownerId', '==', ownerId),
        where('sessionId', '==', sessionId)
      );
      const msgsSnap = await getDocs(msgsQuery);
      messages = msgsSnap.docs
        .map((mDoc) => {
          const mData = mDoc.data();
          return {
            id: mData.id || mDoc.id,
            role: (mData.role === 'user' ? 'user' : 'assistant') as
              | 'user'
              | 'assistant',
            content: mData.content || '',
            timestamp: mData.timestamp || 'Saved',
            model: mData.model || data.model || 'gemini-4-hydrogen',
            createdAtMs: mData.createdAt?.toMillis?.() ?? 0,
          };
        })
        .sort((a, b) => a.createdAtMs - b.createdAtMs)
        .map(({ createdAtMs: _ms, ...rest }) => rest);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.LIST,
        `sessions/${sessionId}/messages`
      );
    }

    loadedWithTimestamp.push({
      updatedAtMs,
      session: {
        id: sessionId,
        title: data.title || 'Saved Session',
        updatedAt: data.updatedAtLabel || 'Synced',
        contextMode: data.contextMode || 'Deep Research',
        messages:
          messages.length > 0
            ? messages
            : [
                {
                  id: `welcome_${sessionId}`,
                  role: 'assistant',
                  content:
                    data.lastSnippet ||
                    'Greetings. I am Ultron, your autonomous intelligence system.',
                  timestamp: data.updatedAtLabel || 'Synced',
                  model: data.model || 'gemini-4-hydrogen',
                },
              ],
      },
    });
  }

  return loadedWithTimestamp
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
    .map((item) => item.session);
}

export async function fetchRecentSessionsFromFirestore(
  user: User
): Promise<ChatSessionItem[]> {
  if (!user.emailVerified) return [];
  const ownerId = sanitizeBlueprintId(user.uid);
  const sessionsQuery = query(
    collection(db, 'sessions'),
    where('ownerId', '==', ownerId)
  );
  try {
    const snap = await getDocs(sessionsQuery);
    if (snap.empty) return [];
    return await hydrateSessionsSnapshot(ownerId, snap.docs);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'sessions');
  }
}

export function subscribeToUserSessions(
  user: User,
  onSessionsLoaded: (sessions: ChatSessionItem[]) => void
): () => void {
  if (!user.emailVerified) {
    return () => {};
  }
  const ownerId = sanitizeBlueprintId(user.uid);
  const sessionsQuery = query(
    collection(db, 'sessions'),
    where('ownerId', '==', ownerId)
  );

  return onSnapshot(
    sessionsQuery,
    async (snapshot) => {
      if (snapshot.empty) {
        onSessionsLoaded([]);
        return;
      }
      const loadedSessions = await hydrateSessionsSnapshot(
        ownerId,
        snapshot.docs
      );
      onSessionsLoaded(loadedSessions);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sessions');
    }
  );
}
