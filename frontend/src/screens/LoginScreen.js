// Alchemy AI — Login / Auth Screen
// SCRUM-43 / SCRUM-131
// UI: Pixel-accurate from Figma CSS spec (Allisa Warren)
//
// Glow strategy:
//   Web:    <div> with radial-gradient via inline style injected into a View
//           (React Native Web renders View as <div>, so CSS works directly)
//   Native: Stacked LinearGradient layers inside a circular overflow:hidden
//           container approximate the radial bloom.
//
// Centering: glow is centered using alignSelf:'center' on the root View,
//   not via absolute left/top pixel values, so it works on all viewport widths.

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Animated,
  useWindowDimensions,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { fetchUserProfile } from '../services/userService';
import { Colors, Spacing } from '../theme';

// Google Sign-In is native-only
let GoogleSignin = null;
if (Platform.OS !== 'web') {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (webClientId) GoogleSignin.configure({ webClientId });
}

// ── Radial Glow Component ────────────────────────────────────────────────────
// On web: injects a true CSS radial-gradient via the 'style' prop (RN Web
//   passes unknown style props through to the underlying <div>).
// On native: stacks two LinearGradients rotated 90° apart inside a clipped
//   oval to approximate the same soft bloom.
function RadialGlow({ width, height }) {
  const borderRadius = Math.round(Math.min(width, height) / 2);

  if (Platform.OS === 'web') {
    return (
      <View
        pointerEvents="none"
        style={{
          width,
          height,
          borderRadius,
          // True CSS radial-gradient — matches Figma exactly
          backgroundImage:
            'radial-gradient(50% 50% at 50% 50%, #C9A84C 0%, rgba(201,168,76,0) 100%)',
        }}
      />
    );
  }

  // Native fallback: two LinearGradients at 0° and 90° stacked
  return (
    <View
      pointerEvents="none"
      style={{ width, height, borderRadius, overflow: 'hidden' }}
    >
      <LinearGradient
        colors={['#C9A84C', 'rgba(201,168,76,0)']}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(201,168,76,0.6)', 'rgba(201,168,76,0)']}
        locations={[0, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.7 }]}
      />
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
  const { width: viewportWidth } = useWindowDimensions();

  // Figma canvas is 393px. Glow is 280×240 on that canvas.
  // We scale by ratio and cap at Figma size so it doesn't grow on wide browsers.
  const canvasW  = Math.min(viewportWidth, 393);
  const glowW    = Math.round(canvasW * (280 / 393));
  const glowH    = Math.round(canvasW * (240 / 393));

  const [loading, setLoading]   = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Auth handlers ──────────────────────────────────────────────────────────
  const handleAuthSuccess = async (userCredential) => {
    try {
      const idToken = await userCredential.user.getIdToken();
      const profile = await fetchUserProfile(idToken);
      navigation.replace('MainTabs', { user: profile, isGuest: false });
    } catch (err) {
      console.error('[LoginScreen] Post-auth fetch failed:', err);
      Alert.alert('Sign-In Error', 'Authenticated but could not load profile. Try again.');
    }
  };

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      await handleAuthSuccess(cred);
    } catch (err) {
      Alert.alert('Sign-In Failed', err.message ?? 'Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNativeSignIn = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const result  = await GoogleSignin.signIn();
      const idToken = result?.data?.idToken || result?.idToken;
      if (!idToken) throw new Error('No ID token from Google');
      const cred = GoogleAuthProvider.credential(idToken);
      await handleAuthSuccess(await signInWithCredential(auth, cred));
    } catch (err) {
      if (err.code !== 'SIGN_IN_CANCELLED') Alert.alert('Auth Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWebSignIn = async () => {
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      await handleAuthSuccess(cred);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') Alert.alert('Auth Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn  = Platform.OS === 'web' ? handleWebSignIn : handleNativeSignIn;
  const handleGuestContinue = () =>
    navigation.replace('MainTabs', { isGuest: true, user: null });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Top nav bar ──────────────────────────────────────────────────────
          Figma: height:60, bg rgba(26,26,26,0.4), gold 1px bottom divider    ── */}
      <View style={styles.topNav}>
        <Text style={styles.topNavText}>ALCHEMY AI</Text>
        <View style={styles.topNavDivider} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.inner,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* ── Glow + Logo block ─────────────────────────────────────────────
              The glow sits BEHIND the text using absolute positioning WITHIN
              this container, which is centered by alignSelf:'center' on .inner.
              This is the correct approach — no viewport-relative left/top.     ── */}
          <View style={[styles.logoBlock, { height: glowH + 80 }]}>
            {/* Glow — absolutely centered within logoBlock */}
            <View
              pointerEvents="none"
              style={[
                styles.glowWrap,
                {
                  width:  glowW,
                  height: glowH,
                  // Center it: pull left by half its width from the 50% mark
                  left: '50%',
                  marginLeft: -(glowW / 2),
                  top: 0,
                },
              ]}
            >
              <RadialGlow width={glowW} height={glowH} />
            </View>

            {/* Text — sits on top of the glow via zIndex */}
            <View style={styles.logoTextWrap}>
              <Text style={styles.logoText}>ALCHEMY</Text>
              <Text style={styles.logoAI}>A I</Text>
            </View>
          </View>

          {/* ── Tagline ── */}
          <Text style={styles.tagline}>The art of the perfect pour</Text>

          {/* ── Glass login card ──────────────────────────────────────────────
              Figma: 300×260, rgba(255,255,255,0.04),
              border 1px rgba(201,168,76,0.25), border-radius:20              ── */}
          <View style={styles.glassCard}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#7A7870"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              accessibilityLabel="Email input"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#7A7870"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleEmailSignIn}
              accessibilityLabel="Password input"
            />

            {/* Sign In — Figma: gradient 90deg #C9A84C 70% → #A8843A */}
            <TouchableOpacity
              onPress={handleEmailSignIn}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Sign In"
            >
              <LinearGradient
                colors={['#C9A84C', '#A8843A']}
                locations={[0.7, 1.0]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.signInBtn, loading && styles.btnDisabled]}
              >
                <Text style={styles.signInBtnText}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* ── Forgot Password ── */}
          <TouchableOpacity
            onPress={() => {}}
            style={styles.forgotWrap}
            accessibilityRole="button"
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* ── Google sign-in ── */}
          <TouchableOpacity
            style={[styles.googleBtn, loading && styles.btnDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Sign in with Google"
          >
            <Text style={styles.googleBtnText}>G   Continue with Google</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* ── Bottom nav bar ────────────────────────────────────────────────────
          Figma: height:80, bg:#1A1A1A, gold 1px top divider, text #C9A84C   ── */}
      <View style={styles.bottomNav}>
        <View style={styles.bottomNavDivider} />
        <TouchableOpacity
          onPress={handleGuestContinue}
          disabled={loading}
          accessibilityRole="button"
        >
          <Text style={styles.journeyText}>New to Alchemy? Begin your journey →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },

  // Top nav
  topNav: {
    height: 60,
    backgroundColor: 'rgba(26,26,26,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavText: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 13,
    letterSpacing: 6,
    color: '#C9A84C',
  },
  topNavDivider: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(201,168,76,0.4)',
  },

  // Scroll
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 24,
  },
  inner: {
    width: '100%',
    maxWidth: 393,
    alignItems: 'center',
  },

  // Logo + glow block
  logoBlock: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    marginTop: Spacing.xxl,
  },
  glowWrap: {
    position: 'absolute',
  },
  logoTextWrap: {
    // Push text down so glow is vertically centered behind it
    marginTop: 60,
    alignItems: 'center',
    zIndex: 1,
  },
  logoText: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 52,
    lineHeight: 63,
    letterSpacing: 16,
    color: '#E8C97A',
    textAlign: 'center',
  },
  logoAI: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 5,
    color: '#7A7870',
    textAlign: 'center',
    marginTop: 6,
  },

  // Tagline
  tagline: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    color: '#5A5855',
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  // Glass card
  glassCard: {
    width: 300,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
    borderRadius: 20,
    gap: Spacing.sm,
  },

  // Inputs
  input: {
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.15)',
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    letterSpacing: 1,
    color: '#F5F5F5',
  },

  // Sign In button
  signInBtn: {
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.55 },
  signInBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 1.5,
    color: '#0D0D0D',
  },

  // Forgot
  forgotWrap: { marginTop: Spacing.md },
  forgotText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
    color: '#7A7870',
    textAlign: 'center',
  },

  // Google button
  googleBtn: {
    width: 300,
    height: 52,
    marginTop: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    letterSpacing: 1,
    color: '#888888',
  },

  // Bottom nav
  bottomNav: {
    height: 80,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavDivider: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(201,168,76,0.4)',
  },
  journeyText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2,
    color: '#C9A84C',
    textAlign: 'center',
  },
});
