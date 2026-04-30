// Alchemy AI — Forgot Password Screen
// SCRUM-212

import React, { useState, useRef, useEffect } from 'react';
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
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { Colors, Spacing } from '../theme';

export default function ForgotPasswordScreen({ navigation }) {
  const { width: viewportWidth } = useWindowDimensions();
  const canvasW = Math.min(viewportWidth, 393);
  const glowW = Math.round(canvasW * (280 / 393));
  const glowH = Math.round(canvasW * (180 / 393));

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSendReset = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Missing Email', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      setSent(true);
    } catch (err) {
      Alert.alert('Reset Failed', err.message ?? 'Unable to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          {/* Glow block */}
          <View style={[styles.glowBlock, { height: glowH + 60 }]}>
            <View
              pointerEvents="none"
              style={[
                styles.glowWrap,
                { width: glowW, height: glowH, left: '50%', marginLeft: -(glowW / 2), top: 0 },
              ]}
            >
              {Platform.OS === 'web' ? (
                <View
                  pointerEvents="none"
                  style={{
                    width: glowW,
                    height: glowH,
                    borderRadius: Math.round(Math.min(glowW, glowH) / 2),
                    backgroundImage:
                      'radial-gradient(50% 50% at 50% 50%, #C9A84C 0%, rgba(201,168,76,0) 100%)',
                  }}
                />
              ) : (
                <View
                  pointerEvents="none"
                  style={{
                    width: glowW,
                    height: glowH,
                    borderRadius: Math.round(Math.min(glowW, glowH) / 2),
                    overflow: 'hidden',
                  }}
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
              )}
            </View>
          </View>

          <Text style={styles.heading}>Reset Password</Text>
          <Text style={styles.subheading}>
            {sent
              ? 'Check your inbox for a reset link.'
              : 'Enter your account email and we’ll send you a reset link.'}
          </Text>

          {!sent ? (
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
                returnKeyType="done"
                onSubmitEditing={handleSendReset}
                accessibilityLabel="Email input"
              />
              <TouchableOpacity
                onPress={handleSendReset}
                disabled={loading}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Send reset email"
              >
                <LinearGradient
                  colors={['#C9A84C', '#A8843A']}
                  locations={[0.7, 1.0]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.submitBtn, loading && styles.btnDisabled]}
                >
                  <Text style={styles.submitBtnText}>
                    {loading ? 'Sending…' : 'Send Reset Email'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.sentBox}>
              <Text style={styles.sentText}>Reset email sent to</Text>
              <Text style={styles.sentEmail}>{email.trim()}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backWrap}
            accessibilityRole="button"
          >
            <Text style={styles.backText}>← Back to Sign In</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <View style={styles.bottomNavDivider} />
        <Text style={styles.bottomNavText}>ALCHEMY AI</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

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
  glowBlock: { width: '100%', position: 'relative', alignItems: 'center', marginTop: Spacing.xxl },
  glowWrap: { position: 'absolute' },
  heading: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 36, lineHeight: 44, letterSpacing: 8,
    color: '#E8C97A', textAlign: 'center', marginBottom: Spacing.sm,
  },
  subheading: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12, lineHeight: 18, letterSpacing: 0.8,
    color: '#5A5855', textAlign: 'center',
    marginBottom: Spacing.lg, maxWidth: 260,
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
  submitBtn: { height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.55 },
  submitBtnText: {
    fontFamily: 'DMSans_500Medium', fontSize: 15, lineHeight: 20, letterSpacing: 1.5, color: '#0D0D0D',
  },
  sentBox: {
    width: 300, paddingVertical: 28, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)',
    borderRadius: 20,
  },
  sentText: {
    fontFamily: 'DMSans_400Regular', fontSize: 12, letterSpacing: 1, color: '#7A7870',
  },
  sentEmail: {
    fontFamily: 'DMSans_500Medium', fontSize: 13, letterSpacing: 1, color: '#C9A84C', marginTop: 6,
  },
  backWrap: { marginTop: Spacing.md },
  backText: {
    fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 16, letterSpacing: 1,
    color: '#7A7870', textAlign: 'center',
  },
  bottomNav: { height: 80, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  bottomNavDivider: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 1, backgroundColor: 'rgba(201,168,76,0.4)',
  },
  bottomNavText: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 11, letterSpacing: 5, color: 'rgba(201,168,76,0.3)',
  },
});
