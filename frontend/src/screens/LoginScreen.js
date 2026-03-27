// SCRUM-43: Google Sign-in UI — redesigned to match Alchemy AI mockup
// Features: glowing orb hero, email/password inputs, Google sign-in, guest access

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';

// Google Sign-In is native-only — skip import on web
let GoogleSignin = null;
if (Platform.OS !== 'web') {
  try {
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'PLACEHOLDER_WEB_CLIENT_ID',
    });
  } catch (e) {
    console.log('GoogleSignin not available:', e);
  }
}

export default function LoginScreen({ navigation }) {
  const [loading, setLoading]   = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

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
      if (!idToken) throw new Error('No ID token returned');

      const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth');
      const { auth } = await import('../../firebaseConfig');
      const { createOrUpdateUserProfile } = await import('../services/userService');

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      await createOrUpdateUserProfile(userCredential.user);
      navigation.replace('MainTabs');
    } catch (err) {
      console.error('Google Sign-In error:', err);
      Alert.alert('Authentication Error', 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = () => navigation.replace('MainTabs');

  return (
    <SafeAreaView style={styles.root}>

      {/* Header */}
      <Text style={styles.header}>ALCHEMY AI</Text>

      {/* Glowing Orb Hero */}
      <View style={styles.orbContainer}>
        <View style={styles.orbGlow} />
        <Text style={styles.orbTitle}>ALCHEMY</Text>
      </View>

      {/* Tagline */}
      <Text style={styles.tagline}>The art of the perfect pour</Text>

      {/* Form */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#5A5A5A"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#5A5A5A"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Google Sign-In Button */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.googleButtonText}>
            {loading ? 'Signing in...' : 'Sign In with Google'}
          </Text>
        </TouchableOpacity>

        {/* Bottom links */}
        <View style={styles.linksRow}>
          <TouchableOpacity onPress={handleGuestContinue}>
            <Text style={styles.linkText}>Continue as Guest</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <TouchableOpacity style={styles.footer}>
        <Text style={styles.footerText}>New to Alchemy? Begin your journey →</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
  },
  header: {
    marginTop: 20,
    fontSize: 12,
    letterSpacing: 6,
    color: '#C9A84C',
    fontWeight: '500',
  },
  orbContainer: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
    width: '100%',
  },
  orbGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#C9A84C',
    opacity: 0.18,
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
    elevation: 20,
  },
  orbTitle: {
    fontSize: 48,
    fontWeight: '300',
    letterSpacing: 14,
    color: '#F5F0E8',
    zIndex: 1,
  },
  tagline: {
    fontSize: 13,
    color: '#6A6A6A',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 32,
  },
  form: {
    width: '100%',
    paddingHorizontal: 28,
  },
  input: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 15,
    color: '#F5F0E8',
    marginBottom: 12,
  },
  googleButton: {
    backgroundColor: '#C9A84C',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  googleButtonText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  linkText: {
    color: '#6A6A6A',
    fontSize: 13,
  },
  footer: {
    position: 'absolute',
    bottom: 32,
  },
  footerText: {
    color: '#C9A84C',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
