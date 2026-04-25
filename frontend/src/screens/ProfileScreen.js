// frontend/src/screens/ProfileScreen.js
// SCRUM-122 — High-fidelity UI screens
// SCRUM-138 — Wire ProfileScreen to GET /api/me and PUT /api/me/preferences
// Assigned to: Allisa Warren
//
// Matches Figma wireframe: avatar initials circle, name, PREMIUM badge,
// settings rows with chevrons, notifications toggle, guest fallback state.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../theme/index';

// ─── Auth context — adjust import path if your project differs ───────────────
let useAuth;
try {
  useAuth = require('../context/AuthContext').useAuth;
} catch {
  useAuth = () => ({ user: null, isGuest: true, signOut: () => {} });
}

// ─── User service ─────────────────────────────────────────────────────────────
let getUserProfile, updatePreferences;
try {
  const svc = require('../services/userService');
  getUserProfile = svc.fetchUserProfile;
  updatePreferences = svc.updateUserPreferences;
} catch {
  getUserProfile = null;
  updatePreferences = null;
}

// ─── Settings rows config ─────────────────────────────────────────────────────
const SETTINGS_ROWS = [
  { key: 'flavorPreferences', label: 'Flavor Preferences', detail: 'Citrus, Bitter, Smoke' },
  { key: 'unitsMeasurements', label: 'Units & Measurements', detail: null },
  { key: 'privacy', label: 'Privacy', detail: null },
  { key: 'subscriptionBilling', label: 'Subscription & Billing', detail: null },
  { key: 'appVersion', label: 'App Version', detail: '1.0.0', noChevron: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Guest fallback screen ────────────────────────────────────────────────────
function GuestProfileScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      <View style={styles.guestContainer}>
        <View style={styles.guestAvatar}>
          <Text style={styles.guestAvatarText}>?</Text>
        </View>
        <Text style={styles.guestHeading}>You're browsing as a guest</Text>
        <Text style={styles.guestSubtext}>
          Sign in to save your favorites, track your cabinet, and get personalized recommendations.
        </Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => navigation?.navigate('Login')}
          accessibilityRole="button"
          accessibilityLabel="Sign in to your account"
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
        <View style={styles.versionRow}>
          <Text style={styles.versionText}>App Version 1.0.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Main profile screen ──────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Try to get auth context — fail gracefully
  let authUser = null;
  let signOut = () => navigation?.navigate('Login');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const authContext = useAuth ? useAuth() : null;
  if (authContext) {
    authUser = authContext.user ?? null;
    if (authContext.isGuest) setIsGuest(true);
    if (authContext.signOut) signOut = authContext.signOut;
  }

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!getUserProfile) throw new Error('userService not available');
      const data = await getUserProfile();
      setProfile(data);
      if (data?.preferences?.notificationsEnabled !== undefined) {
        setNotificationsEnabled(data.preferences.notificationsEnabled);
      }
    } catch (err) {
      // If we get a 401/403 or no user, treat as guest
      if (authUser === null) {
        setIsGuest(true);
      } else {
        setError(err.message || 'Could not load profile.');
      }
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleNotificationToggle = async (value) => {
    setNotificationsEnabled(value);
    try {
      if (updatePreferences) {
        await updatePreferences({ notificationsEnabled: value });
      }
    } catch {
      // Silently revert
      setNotificationsEnabled(!value);
    }
  };

  // ── Guest state ──────────────────────────────────────────────────────────
  if (!loading && (isGuest || (error && authUser === null))) {
    return <GuestProfileScreen navigation={navigation} />;
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state (logged-in user, real error) ──────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Display name / initials ───────────────────────────────────────────────
  const displayName = profile?.displayName || authUser?.displayName || 'User';
  const isPremium = profile?.isPremium ?? false;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar + Name + Badge ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>PREMIUM</Text>
            </View>
          )}
        </View>

        {/* ── Divider ── */}
        <View style={styles.divider} />

        {/* ── Settings section label ── */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>

        {/* ── Settings rows ── */}
        {SETTINGS_ROWS.map((row, index) => (
          <TouchableOpacity
            key={row.key}
            style={[
              styles.settingsRow,
              index === SETTINGS_ROWS.length - 1 && styles.settingsRowLast,
            ]}
            onPress={() => {}}
            activeOpacity={row.noChevron ? 1 : 0.6}
            accessibilityRole={row.noChevron ? 'text' : 'button'}
            accessibilityLabel={row.label}
          >
            <View style={styles.settingsRowLeft}>
              <Text style={styles.settingsRowLabel}>{row.label}</Text>
              {row.detail && (
                <Text style={styles.settingsRowDetail}>{row.detail}</Text>
              )}
            </View>
            {!row.noChevron && (
              <Text style={styles.chevron}>›</Text>
            )}
          </TouchableOpacity>
        ))}

        {/* ── Notifications toggle row ── */}
        <View style={styles.settingsRow}>
          <Text style={styles.settingsRowLabel}>Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: Colors.border, true: Colors.accent }}
            thumbColor={Colors.textPrimary}
            accessibilityRole="switch"
            accessibilityLabel="Toggle notifications"
            accessibilityState={{ checked: notificationsEnabled }}
          />
        </View>

        {/* ── Divider ── */}
        <View style={[styles.divider, { marginTop: Spacing.lg }]} />

        {/* ── Sign Out ── */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.headingS,
    color: Colors.textPrimary,
  },

  // ── Scroll content ────────────────────────────────────────────────────────
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },

  // ── Avatar section ────────────────────────────────────────────────────────
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 2,
    borderColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarInitials: {
    ...Typography.headingS,
    color: Colors.accent,
    fontSize: 28,
  },
  displayName: {
    ...Typography.headingXS,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  premiumBadge: {
    backgroundColor: Colors.accentDim,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  premiumBadgeText: {
    ...Typography.label,
    color: Colors.accent,
    fontSize: 10,
    letterSpacing: 2,
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },

  // ── Section label ─────────────────────────────────────────────────────────
  sectionLabel: {
    ...Typography.sectionHeader,
    color: Colors.textFaint,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  // ── Settings rows ─────────────────────────────────────────────────────────
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingsRowLast: {
    borderBottomWidth: 0,
  },
  settingsRowLeft: {
    flex: 1,
  },
  settingsRowLabel: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  settingsRowDetail: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },

  // ── Sign Out ──────────────────────────────────────────────────────────────
  signOutButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  signOutText: {
    ...Typography.bodyMedium,
    color: Colors.error,
  },

  // ── Guest state ───────────────────────────────────────────────────────────
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  guestAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  guestAvatarText: {
    fontSize: 32,
    color: Colors.textSecondary,
  },
  guestHeading: {
    ...Typography.headingXS,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  guestSubtext: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  signInButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
  },
  signInButtonText: {
    ...Typography.button,
    color: Colors.background,
    fontWeight: '600',
  },
  versionRow: {
    position: 'absolute',
    bottom: Spacing.xl,
  },
  versionText: {
    ...Typography.caption,
    color: Colors.textFaint,
  },

  // ── Error state ───────────────────────────────────────────────────────────
  errorText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
  },
  retryButtonText: {
    ...Typography.button,
    color: Colors.background,
  },
});
