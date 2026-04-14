// SCRUM-43: Google Sign-in UI with loading, error, and success states
// SCRUM-131: Fixed — wired to GET /api/me, added web sign-in path, guest state flag
// Alchemy AI — Login / Auth Screen

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

// Google Sign-In is native-only — skip import on web
let GoogleSignin = null;
if (Platform.OS !== 'web') {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    // Fail loudly during dev so misconfiguration is immediately visible
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

  // ─── Shared post-auth handler ────────────────────────────────────────────
  // Called after Firebase credential is resolved on both native and web.
  // Fetches the user profile from the backend (GET /api/me) and navigates.
  const handleAuthSuccess = async (userCredential) => {
    try {
      // Get the Firebase ID token to authenticate against our backend
      const idToken = await userCredential.user.getIdToken();

      // SCRUM-131 fix: call GET /api/me instead of writing directly to Firestore.
      // The backend handles first-login profile creation and returns the profile.
      const profile = await fetchUserProfile(idToken);

      // Navigate with the resolved profile so MainTabs can populate user context
      navigation.replace('MainTabs', { user: profile, isGuest: false });
    } catch (err) {
      console.error('[LoginScreen] Post-auth profile fetch failed:', err);
      Alert.alert(
        'Sign-In Error',
        'Authenticated successfully but could not load your profile. Please try again.'
      );
    }
  };

  // ─── Native sign-in (iOS / Android) ─────────────────────────────────────
  const handleNativeSignIn = async () => {
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
  // SCRUM-131 fix: previously showed an Alert blocking web auth entirely.
  // Now uses signInWithPopup so the team can test the full auth flow on web.
  const handleWebSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      await handleAuthSuccess(userCredential);
    } catch (err) {
      console.error('[LoginScreen] Web Google Sign-In error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        // User dismissed the popup — no alert needed
      } else {
        Alert.alert('Authentication Error', `Google sign-in failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = Platform.OS === 'web' ? handleWebSignIn : handleNativeSignIn;

  // ─── Guest mode ───────────────────────────────────────────────────────────
  // SCRUM-131 fix: pass isGuest: true so downstream screens can gate
  // restricted features per FR-26 instead of reading undefined auth state.
  const handleGuestContinue = () => {
    navigation.replace('MainTabs', { isGuest: true, user: null });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.brandSection}>
        <Text style={styles.logo}>⚗</Text>
        <Text style={styles.title}>Alchemy</Text>
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
    color: '#7A7870',
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
  buttonDisabled: {
    opacity: 0.6,
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
