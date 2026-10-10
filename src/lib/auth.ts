import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { NextRequest } from 'next/server';

let adminApp: ReturnType<typeof initializeApp> | null = null;

function getAdminApp() {
  if (!adminApp) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!projectId || !clientEmail || !privateKey) {
      return null;
    }
    
    adminApp = getApps().length === 0 
      ? initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        })
      : getApps()[0];
  }
  return adminApp;
}

export async function verifyAuthToken(request: NextRequest): Promise<{ uid: string; email?: string } | null> {
  try {
    const adminApp = getAdminApp();
    if (!adminApp) {
      if (process.env.NODE_ENV === 'development') {
        return { uid: 'dev-user', email: 'dev@example.com' };
      }
      return null;
    }
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    const adminAuth = getAuth(adminApp);
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error('Auth verification failed:', error);
    return null;
  }
}

export function requireAuth(request: NextRequest): Promise<{ uid: string; email?: string }> {
  return verifyAuthToken(request).then(user => {
    if (!user) {
      throw new Error('Unauthorized');
    }
    return user;
  });
}

export async function getOptionalUser(request: NextRequest): Promise<{ uid: string; email?: string } | null> {
  return verifyAuthToken(request);
}