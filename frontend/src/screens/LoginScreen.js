// Alchemy AI — Login / Auth Screen
// SCRUM-43: Google Sign-in UI with loading, error, and success states
// SCRUM-131: Fixed — wired to GET /api/me, added web sign-in path, guest state flag
// Updated: replaced hardcoded hex values with theme tokens

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { fetchUserProfile } from '../services/userService';
import { Colors, Typography, Spacing, Radius } from '../theme';

// Google Sign-In is native-only — skip import on web
let GoogleSignin = null;
if (Platform.OS !== 'web') {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    console.error(
      '[LoginScreen] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set. ' +
        'Copy frontend/.env.example to frontend/.env and fill in the value.'
    );
  } else {
    GoogleSignin.configure({ webClientId });
  }
}

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  // ─── Shared post-auth handler ─────────────────────────────────────────────
  const handleAuthSuccess = async (userCredential) => {
    try {
      const idToken = await userCredential.user.getIdToken();
      const profile = await fetchUserProfile(idToken);
      navigation.replace('MainTabs', { user: profile, isGuest: false });
    } catch (err) {
      console.error('[LoginScreen] Post-auth profile fetch failed:', err);
      Alert.alert(
        'Sign-In Error',
        'Authenticated successfully but could not load your profile. Please try again.'
      );
    }
  };

  // ─── Native sign-in (iOS / Android) ──────────────────────────────────────
  const handleNativeSignIn = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult?.data?.idToken || signInResult?.idToken;

      if (!idToken) throw new Error('No ID token returned from Google Sign-In');

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      await handleAuthSuccess(userCredential);
    } catch (err) {
      console.error('[LoginScreen] Native Google Sign-In error:', err);
      if (err.code === 'SIGN_IN_CANCELLED') {
        // User cancelled — no alert needed
      } else if (err.code === 'IN_PROGRESS') {
        Alert.alert('Sign-In', 'Sign-in is already in progress.');
      } else if (err.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        Alert.alert('Error', 'Google Play Services is not available on this device.');
      } else {
        Alert.alert('Authentication Error', `Google sign-in failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Web sign-in (browser / Expo web) ────────────────────────────────────
  const handleWebSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      await handleAuthSuccess(userCredential);
    } catch (err) {
      console.error('[LoginScreen] Web Google Sign-In error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        Alert.alert('Authentication Error', `Google sign-in failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = Platform.OS === 'web' ? handleWebSignIn : handleNativeSignIn;

  const handleGuestContinue = () => {
    navigation.replace('MainTabs', { isGuest: true, user: null });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.brandSection}>
        <Text style={styles.logo}>ALCHEMY</Text>
        <Text style={styles.logoSub}>A I</Text>
        <Text style={styles.tagline}>The art of the perfect pour</Text>
      </View>

      <View style={styles.authSection}>
        <TouchableOpacity
          style={[styles.googleButton, loading && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={loading}
          accessibilityLabel="Sign in with Google"
          accessibilityRole="button"
        >
          <Text style={styles.googleButtonText}>
            {loading ? 'Signing in…' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.orText}>— or —</Text>

        <TouchableOpacity
          style={styles.guestButton}
          onPress={handleGuestContinue}
          disabled={loading}
          accessibilityLabel="Explore as guest"
          accessibilityRole="button"
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
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logo: {
    ...Typography.display,
    color: Colors.accentLight,
    letterSpacing: 15,
  },
  logoSub: {
    ...Typography.sectionHeader,
    color: Colors.textHint,
    letterSpacing: 8,
    marginTop: Spacing.xs,
  },
  tagline: {
    ...Typography.caption,
    color: Colors.textUltraFaint,
    marginTop: Spacing.sm,
    letterSpacing: 1,
  },
  authSection: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  googleButton: {
    width: '100%',
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    ...Typography.labelMedium,
    color: Colors.background,
  },
  orText: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginVertical: Spacing.md,
  },
  guestButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  guestButtonText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
