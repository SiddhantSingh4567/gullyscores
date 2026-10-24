import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle, signOutUser, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserRole } from '../types/cricket';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isOrganizer: boolean;
  demoMode: boolean;
  setDemoMode: (val: boolean) => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'siddhants4567@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [demoMode, setDemoModeState] = useState<boolean>(() => {
    // Default to false so real backend persistence is active, but persisted in localStorage
    return localStorage.getItem('gullyscore_demo_mode') === 'true';
  });

  const setDemoMode = (val: boolean) => {
    setDemoModeState(val);
    localStorage.setItem('gullyscore_demo_mode', val ? 'true' : 'false');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
          } else {
            // New user registration
            const defaultRole: UserRole = currentUser.email === ADMIN_EMAIL ? 'admin' : 'organizer';
            const newProfile: UserProfile = {
              id: currentUser.uid,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Gully Scorer',
              email: currentUser.email || '',
              role: defaultRole,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
          }
        } catch (error) {
          console.warn('Could not fetch user profile from Firestore:', error);
          // Fallback in-memory profile
          setUserProfile({
            id: currentUser.uid,
            displayName: currentUser.displayName || 'Gully Scorer',
            email: currentUser.email || '',
            role: currentUser.email === ADMIN_EMAIL ? 'admin' : 'organizer',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    return user.email === ADMIN_EMAIL || userProfile?.role === 'admin';
  }, [user, userProfile]);

  const isOrganizer = useMemo(() => {
    if (!user) return false;
    return isAdmin || userProfile?.role === 'organizer';
  }, [user, userProfile, isAdmin]);

  const signIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign-in failed:', err);
    }
  };

  const signOut = async () => {
    await signOutUser();
    setUser(null);
    setUserProfile(null);
  };

  const updateUserRole = async (role: UserRole) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(
        userDocRef,
        {
          role,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setUserProfile((prev) => (prev ? { ...prev, role } : null));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isAdmin,
        isOrganizer,
        demoMode,
        setDemoMode,
        signIn,
        signOut,
        updateUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
