// SCRUM-43: Google Sign-in UI with loading, error, and success states
// Alchemy AI — Login / Auth Screen (simplified for web testing)

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { createOrUpdateUserProfile } from '../services/userService';

// Google Sign-In is native-only — skip import on web
let GoogleSignin = null;
if (Platform.OS !== 'web') {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'PLACEHOLDER_WEB_CLIENT_ID',
  });
}

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Google Sign-In is only available on mobile devices.');
      return;
    }
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult?.data?.idToken || signInResult?.idToken;

      if (!idToken) {
        throw new Error('No ID token returned from Google Sign-In');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      await createOrUpdateUserProfile(userCredential.user);
      navigation.replace('MainTabs');
    } catch (err) {
      console.error('Google Sign-In error:', err);
      if (err.code === 'SIGN_IN_CANCELLED') {
        // User cancelled
      } else if (err.code === 'IN_PROGRESS') {
        Alert.alert('Sign-In', 'Sign-in is already in progress.');
      } else if (err.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        Alert.alert('Error', 'Google Play Services is not available on this device.');
      } else {
        Alert.alert('Authentication Error', 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = () => {
    navigation.replace('MainTabs');
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandSection}>
        <Text style={styles.logo}>⚗</Text>
        <Text style={styles.title}>Alchemy</Text>
        <Text style={styles.tagline}>Your personal mixology companion</Text>
      </View>

      <View style={styles.authSection}>
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          <Text style={styles.googleButtonText}>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.orText}>— or —</Text>

        <TouchableOpacity
          style={styles.guestButton}
          onPress={handleGuestContinue}
        >
          <Text style={styles.guestButtonText}>Explore as Guest</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#F5F0E8',
  },
  tagline: {
    fontSize: 14,
    color: '#8A8A8A',
    marginTop: 8,
  },
  authSection: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  googleButton: {
    width: '100%',
    backgroundColor: '#C9A84C',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: '600',
  },
  orText: {
    color: '#4A4A4A',
    marginVertical: 16,
  },
  guestButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  guestButtonText: {
    color: '#8A8A8A',
    fontSize: 16,
  },
});
