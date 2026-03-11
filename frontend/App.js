// App.js
// Alchemy AI — Root Entry Point

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Skip Firebase auth if API key is not configured
    const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey || apiKey === 'your_firebase_api_key_here') {
      console.warn('Firebase API key not configured — skipping auth');
      setReady(true);
      return;
    }

    // Only import and use Firebase if we have a real key
    const { onAuthStateChanged } = require('firebase/auth');
    const { auth } = require('./firebaseConfig');

    const timeout = setTimeout(() => {
      console.warn('Firebase auth timed out — continuing without auth');
      setReady(true);
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(timeout);
      setUser(firebaseUser);
      setReady(true);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.loader}>
        <Text style={styles.loadingText}>Loading Alchemy AI...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <RootNavigator user={user} />
    </>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#C9A84C',
    fontSize: 18,
  },
});
