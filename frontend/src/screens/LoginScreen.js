// src/screens/LoginScreen.js
// Alchemy AI — Login / Auth Screen
// Handles Google OAuth flow (stubbed for Sprint 1, ready for real credentials)

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
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Colors, Typography, Spacing, Radius } from '../theme';

// Required for Google OAuth redirect handling
WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

// ─── Google OAuth Config ───────────────────────────────────────────────────
// TODO Sprint 2: Replace with real credentials from Google Cloud Console
// 1. Go to https://console.cloud.google.com/
// 2. Create OAuth 2.0 credentials for iOS + Android
// 3. Paste your client IDs below
const GOOGLE_CLIENT_ID_IOS     = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_ANDROID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_WEB     = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint:         'https://oauth2.googleapis.com/token',
  revocationEndpoint:    'https://oauth2.googleapis.com/revoke',
};
// ──────────────────────────────────────────────────────────────────────────

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

  // Build redirect URI automatically from Expo
  const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

  // Google OAuth request
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId:    GOOGLE_CLIENT_ID_WEB, // swap per platform as needed
      redirectUri,
      scopes:      ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Token,
    },
    discovery
  );

  // Handle OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { access_token } = response.params;
      handleAuthSuccess(access_token);
    } else if (response?.type === 'error') {
      Alert.alert('Authentication Error', 'Google sign-in failed. Please try again.');
      setLoading(false);
    }
  }, [response]);

  const handleAuthSuccess = async (token) => {
    try {
      // TODO Sprint 2: Send token to your backend for verification & session creation
      // e.g., await api.verifyGoogleToken(token);
      console.log('Google OAuth token received:', token);

      // Navigate to main app
      navigation.replace('MainTabs');
    } catch (err) {
      Alert.alert('Error', 'Could not complete sign in. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await promptAsync();
    // loading state cleared in response handler
  };

  const handleGuestContinue = () => {
    // TODO Sprint 2: Set guest session flag in context/state
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

          {/* Google OAuth Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading || !request}
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
    // blur via shadow (RN approximation)
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
