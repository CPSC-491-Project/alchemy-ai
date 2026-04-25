// App.js
// Alchemy AI — Root Entry Point
// Loads Cormorant Garamond + DM Sans before rendering

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  CormorantGaramond_300Light,
} from '@expo-google-fonts/cormorant-garamond';
import {
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';

import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // ── Load custom fonts ──────────────────────────────────────────────────────
  const [fontsLoaded] = useFonts({
    CormorantGaramond_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  // ── Firebase auth ──────────────────────────────────────────────────────────
  useEffect(() => {
    const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey || apiKey === 'your_firebase_api_key_here') {
      console.warn('Firebase API key not configured — skipping auth');
      setReady(true);
      return;
    }

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

  // ── Wait for both fonts and auth ───────────────────────────────────────────
  if (!fontsLoaded || !ready) {
    return (
      <View style={styles.loader}>
        <Text style={styles.loadingText}>Loading Alchemy AI...</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator user={user} />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#C9A84C',
    fontSize: 18,
  },
});
