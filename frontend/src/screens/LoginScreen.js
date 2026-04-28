// Alchemy AI — Login / Auth Screen
// SCRUM-43 / SCRUM-131
// UI: Pixel-accurate from Figma CSS spec (Allisa Warren)
//
// Glow strategy:
// Web: <div> with radial-gradient via inline style injected into a View
// (React Native Web renders View as <div>, so CSS works directly)
// Native: Stacked LinearGradient layers inside a circular overflow:hidden
// container approximate the radial bloom.
//
// Centering: glow is centered using alignSelf:'center' on the root View,
// not via absolute left/top pixel values, so it works on all viewport widths.
//
// Auth strategy (updated):
// Web  → Firebase signInWithPopup (unchanged)
// iOS/Android → expo-auth-session (replaces @react-native-google-signin so
//               it works in Expo Go without a custom native build)

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
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { fetchUserProfile } from '../services/userService';
import { Colors, Spacing } from '../theme';

// Required for expo-auth-session to close the browser after sign-in
WebBrowser.maybeCompleteAuthSession();

// ── Radial Glow Component ──────────────────────────────────────────────────────
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
          backgroundImage:
            'radial-gradient(50% 50% at 50% 50%, #C9A84C 0%, rgba(201,168,76,0) 100%)',
        }}
      />
    );
  }
  return (
    <View pointerEvents="none" style={{ width, height, borderRadius, overflow: 'hidden' }}>
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

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
  const { width: viewportWidth } = useWindowDimensions();
  const canvasW = Math.min(viewportWidth, 393);
  const glowW = Math.round(canvasW * (280 / 393));
  const glowH = Math.round(canvasW * (240 / 393));

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // expo-auth-session Google provider — works in Expo Go on iOS & Android
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });



  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  // Handle the response from expo-auth-session after user completes Google sign-in
  useEffect(() => {
    if (response?.type === 'success') {
      const id_token = response.params?.id_token ?? response.authentication?.idToken;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(handleAuthSuccess)
        .catch((err) => Alert.alert('Auth Error', err.message))
        .finally(() => setLoading(false));
    }
  }, [response]);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  // SCRUM-192: handleAuthSuccess now navigates to MainTabs even if /api/me
  // fails (e.g. network error or first-login race condition). Profile fetch
  // failure is logged but no longer blocks navigation after successful auth.
  const handleAuthSuccess = async (userCredential) => {
    try {
      const idToken = await userCredential.user.getIdToken();
      let profile = null;
      try {
        profile = await fetchUserProfile(idToken);
      } catch (profileErr) {
        console.warn('[LoginScreen] Profile fetch failed, navigating anyway:', profileErr.message);
      }
      navigation.replace('MainTabs', { user: profile, isGuest: false });
    } catch (err) {
      console.error('[LoginScreen] Post-auth error:', err);
      Alert.alert('Sign-In Error', 'Something went wrong. Please try again.');
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

  // Native: uses expo-auth-session (works in Expo Go, no custom build needed)
  const handleNativeSignIn = async () => {
    setLoading(true);
    try {
      await promptAsync();
      // result handled in the useEffect above watching `response`
    } catch (err) {
      Alert.alert('Auth Error', err.message);
      setLoading(false);
    }
  };

  // Web: Firebase popup (unchanged)
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

  const handleGoogleSignIn = Platform.OS === 'web' ? handleWebSignIn : handleNativeSignIn;
  const handleGuestContinue = () => navigation.replace('MainTabs', { isGuest: true, user: null });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Top nav */}
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
          style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Glow + Logo */}
          <View style={[styles.logoBlock, { height: glowH + 80 }]}>
            <View
              pointerEvents="none"
              style={[
                styles.glowWrap,
                { width: glowW, height: glowH, left: '50%', marginLeft: -(glowW / 2), top: 0 },
              ]}
            >
              <RadialGlow width={glowW} height={glowH} />
            </View>
            <View style={styles.logoTextWrap}>
              <Text style={styles.logoText}>ALCHEMY</Text>
              <Text style={styles.logoAI}>A I</Text>
            </View>
          </View>

          {/* Tagline */}
          <Text style={styles.tagline}>The art of the perfect pour</Text>

          {/* Glass login card */}
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
                <Text style={styles.signInBtnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity onPress={() => {}} style={styles.forgotWrap} accessibilityRole="button">
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Google sign-in */}
          <TouchableOpacity
            style={[styles.googleBtn, loading && styles.btnDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading || (!request && Platform.OS !== 'web')}
            accessibilityRole="button"
            accessibilityLabel="Sign in with Google"
          >
            <Text style={styles.googleBtnText}>G  Continue with Google</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <View style={styles.bottomNavDivider} />
        <TouchableOpacity onPress={handleGuestContinue} disabled={loading} accessibilityRole="button">
          <Text style={styles.journeyText}>New to Alchemy? Begin your journey →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D0D' },
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
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 1, backgroundColor: 'rgba(201,168,76,0.4)',
  },
  scroll: { flexGrow: 1, alignItems: 'center', paddingBottom: 24 },
  inner: { width: '100%', maxWidth: 393, alignItems: 'center' },
  logoBlock: { width: '100%', position: 'relative', alignItems: 'center', marginTop: Spacing.xxl },
  glowWrap: { position: 'absolute' },
  logoTextWrap: { marginTop: 60, alignItems: 'center', zIndex: 1 },
  logoText: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 52, lineHeight: 63, letterSpacing: 16,
    color: '#E8C97A', textAlign: 'center',
  },
  logoAI: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11, lineHeight: 14, letterSpacing: 5,
    color: '#7A7870', textAlign: 'center', marginTop: 6,
  },
  tagline: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12, lineHeight: 16, letterSpacing: 1.2,
    color: '#5A5855', textAlign: 'center',
    marginTop: Spacing.lg, marginBottom: Spacing.lg,
  },
  glassCard: {
    width: 300, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)',
    borderRadius: 20, gap: Spacing.sm,
  },
  input: {
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)',
    borderRadius: 10, paddingHorizontal: Spacing.md,
    fontFamily: 'DMSans_400Regular', fontSize: 13, letterSpacing: 1, color: '#F5F5F5',
  },
  signInBtn: { height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.55 },
  signInBtnText: {
    fontFamily: 'DMSans_500Medium', fontSize: 15, lineHeight: 20, letterSpacing: 1.5, color: '#0D0D0D',
  },
  forgotWrap: { marginTop: Spacing.md },
  forgotText: {
    fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 16, letterSpacing: 1,
    color: '#7A7870', textAlign: 'center',
  },
  googleBtn: {
    width: 300, height: 52, marginTop: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  googleBtnText: {
    fontFamily: 'DMSans_400Regular', fontSize: 13, letterSpacing: 1, color: '#888888',
  },
  bottomNav: { height: 80, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  bottomNavDivider: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 1, backgroundColor: 'rgba(201,168,76,0.4)',
  },
  journeyText: {
    fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 16, letterSpacing: 2,
    color: '#C9A84C', textAlign: 'center',
  },
});
