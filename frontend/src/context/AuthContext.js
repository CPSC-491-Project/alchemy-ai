// frontend/src/context/AuthContext.js
// SCRUM-190 — fix: ProfileScreen shows guest state when user is logged in
// Root cause: AuthContext did not exist. ProfileScreen's try/catch import
// fell back to { user: null, isGuest: true } on every render.
//
// Assigned to: Allisa Warren

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({
  user: null,
  isGuest: true,
  signOut: () => {},
});

export function AuthProvider({ children, user: initialUser }) {
  const [user, setUser] = useState(initialUser ?? null);

  // Keep in sync when App.js re-renders with a new Firebase user
  useEffect(() => {
    setUser(initialUser ?? null);
  }, [initialUser]);

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
    <AuthContext.Provider value={{ user, isGuest: user === null, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
