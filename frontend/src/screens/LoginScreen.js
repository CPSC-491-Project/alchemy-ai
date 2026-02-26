// src/screens/LoginScreen.js
// Alchemy AI — Login / Auth Screen
// Real Firebase Google Sign-In via @react-native-google-signin

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { createOrUpdateUserProfile } from '../services/userService';
import { Colors, Typography, Spacing, Radius } from '../theme';

const { width, height } = Dimensions.get('window');

// Configure Google Sign-In on module load
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'PLACEHOLDER_WEB_CLIENT_ID',
});

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  // Fade-in animation on mount
  const fadeAnim  = new Animated.Value(0);
  const slideAnim = new Animated.Value(30);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult?.data?.idToken || signInResult?.idToken;

      if (!idToken) {
        throw new Error('No ID token returned from Google Sign-In');
      }

      // Create Firebase credential and sign in
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);

      // Create or update Firestore user profile
      await createOrUpdateUserProfile(userCredential.user);

      // Navigate to main app
      navigation.replace('MainTabs');
    } catch (err) {
      console.error('Google Sign-In error:', err);
      if (err.code === 'SIGN_IN_CANCELLED') {
        // User cancelled — no alert needed
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
      {/* Background gradient */}
      <LinearGradient
        colors={['#0A0A0A', '#111008', '#0A0A0A']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient glow behind logo */}
      <View style={styles.glowContainer}>
        <View style={styles.glow} />
      </View>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* ── Logo / Brand ── */}
        <View style={styles.brandSection}>
          <View style={styles.logoMark}>
            <Text style={styles.logoSymbol}>⚗</Text>
          </View>
          <Text style={styles.brandName}>Alchemy</Text>
          <Text style={styles.brandTagline}>Your personal mixology companion</Text>
        </View>

        {/* ── Auth Buttons ── */}
        <View style={styles.authSection}>
          {/* Divider label */}
          <Text style={styles.sectionLabel}>Sign in to continue</Text>

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={Colors.background} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Guest access */}
          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleGuestContinue}
            activeOpacity={0.7}
          >
            <Text style={styles.guestButtonText}>Explore as guest</Text>
          </TouchableOpacity>

          {/* Terms note */}
          <Text style={styles.termsText}>
            By continuing you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Ambient glow ──
  glowContainer: {
    position: 'absolute',
    top: height * 0.15,
    alignSelf: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.accentGlow,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 80,
  },

  // ── Layout ──
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
    paddingTop: height * 0.18,
    paddingBottom: Spacing.xxl,
  },

  // ── Brand section ──
  brandSection: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentGlow,
    marginBottom: Spacing.md,
  },
  logoSymbol: {
    fontSize: 36,
  },
  brandName: {
    ...Typography.display,
    fontSize: 42,
    color: Colors.textPrimary,
  },
  brandTagline: {
    ...Typography.subheading,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },

  // ── Auth section ──
  authSection: {
    gap: Spacing.md,
  },
  sectionLabel: {
    ...Typography.label,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },

  // Google button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: 16,
    gap: Spacing.sm,
  },
  googleButtonText: {
    ...Typography.button,
    color: Colors.background,
    fontSize: 16,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },

  // Guest button
  guestButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  guestButtonText: {
    ...Typography.button,
    color: Colors.textSecondary,
  },

  // Terms
  termsText: {
    ...Typography.bodySmall,
    textAlign: 'center',
    color: Colors.textMuted,
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.accent,
  },
});
