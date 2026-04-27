// frontend/src/context/AuthContext.js
// SCRUM-193 — fix: ProfileScreen shows guest state when user is logged in
// AuthProvider now subscribes to Firebase onAuthStateChanged directly
// instead of receiving user as a prop, eliminating the timing race.

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({
  user: null,
  isGuest: true,
  loading: true,
  signOut: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const { onAuthStateChanged } = require('firebase/auth');
      const { auth } = require('../../firebaseConfig');
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser ?? null);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('AuthContext: Firebase not available', e);
      setLoading(false);
    }
  }, []);

  const signOut = async () => {
    try {
      const { signOut: firebaseSignOut } = require('firebase/auth');
      const { auth } = require('../../firebaseConfig');
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('signOut error', e);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isGuest: user === null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
