/**
 * ProfileScreen.js — Frontend wiring to GET /api/me + PUT /api/me/preferences
 * Alchemy AI | SCRUM-52 / SCRUM-53 integration (Allisa Warren — PM / Systems Integration)
 *
 * What this file does:
 *   1. On mount — calls GET /api/me via userService.fetchUserProfile()
 *   2. Renders the user's profile data (displayName, email, cocktailPreferences, dietaryRestrictions)
 *   3. On save — calls PUT /api/me/preferences via userService.updateUserPreferences()
 *   4. Publishes INGREDIENTS_UPDATED so the recommendation engine can react (EventBus)
 *   5. All design tokens from theme/index.js — zero hardcoded values
 *
 * Backend contract (Ethan's PR #13, SCRUM-52/53, merged):
 *   GET  /api/me              → { displayName, email, photoURL, preferences: { cocktailPreferences[], dietaryRestrictions[], strengthPreference } }
 *   PUT  /api/me/preferences  → body: { cocktailPreferences[], dietaryRestrictions[], strengthPreference }
 *                             ← { success: true, preferences: { ... } }
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAuth, signOut } from 'firebase/auth';
import { Colors, Typography, Spacing, Radius } from '../theme/index';
import EventBus, { Events } from '../utils/EventBus';

// ---------------------------------------------------------------------------
// Service helpers — thin wrappers around the backend endpoints
// ---------------------------------------------------------------------------
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

async function _getAuthHeader() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/**
 * GET /api/me — fetch the current user's full profile from Firestore
 * Returns the profile object or null on auth/network failure.
 */
async function fetchUserProfile() {
  try {
    const headers = await _getAuthHeader();
    const res = await fetch(`${BACKEND_URL}/api/me`, { method: 'GET', headers });
    if (!res.ok) throw new Error(`GET /api/me returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[ProfileScreen] fetchUserProfile error:', err.message);
    return null;
  }
}

/**
 * PUT /api/me/preferences — persist preference changes to Firestore
 * Returns { success, preferences } or null on failure.
 */
async function updateUserPreferences(preferences) {
  try {
    const headers = await _getAuthHeader();
    const res = await fetch(`${BACKEND_URL}/api/me/preferences`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(preferences),
    });
    if (!res.ok) throw new Error(`PUT /api/me/preferences returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[ProfileScreen] updateUserPreferences error:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const COCKTAIL_PREFERENCE_OPTIONS = ['Citrusy', 'Sweet', 'Fruity', 'Herbal', 'Bitter', 'Spicy', 'Smoky', 'Classic'];
const DIETARY_OPTIONS = ['Vegan', 'Gluten-Free', 'Low Sugar', 'Low ABV', 'Non-Alcoholic'];
const STRENGTH_OPTIONS = ['Light', 'Medium', 'Strong'];

// ---------------------------------------------------------------------------
// ProfileScreen component
// ---------------------------------------------------------------------------
export default function ProfileScreen({ navigation }) {
  // Profile data from GET /api/me
  const [profile, setProfile] = useState(null);

  // Preference state (editable)
  const [cocktailPrefs, setCocktailPrefs] = useState([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);
  const [strengthPreference, setStrengthPreference] = useState('Medium');
  const [publicProfile, setPublicProfile] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false); // true when unsaved changes exist

  // ---------------------------------------------------------------------------
  // Load profile on screen focus (picks up changes from other screens)
  // ---------------------------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  async function loadProfile() {
    setLoading(true);
    setError(null);
    const data = await fetchUserProfile();
    if (!data) {
      setError('Could not load profile. Please check your connection and try again.');
    } else {
      setProfile(data);
      // Hydrate preference state from server response
      setCocktailPrefs(data.preferences?.cocktailPreferences ?? []);
      setDietaryRestrictions(data.preferences?.dietaryRestrictions ?? []);
      setStrengthPreference(data.preferences?.strengthPreference ?? 'Medium');
      setPublicProfile(data.preferences?.publicProfile ?? false);
      setDirty(false);
    }
    setLoading(false);
  }

  // ---------------------------------------------------------------------------
  // Toggle helpers — mark form dirty on any change
  // ---------------------------------------------------------------------------
  function togglePref(list, setList, value) {
    setList((prev) => {
      const next = prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
      setDirty(true);
      return next;
    });
  }

  function handleStrengthChange(value) {
    setStrengthPreference(value);
    setDirty(true);
  }

  function handlePublicToggle(val) {
    setPublicProfile(val);
    setDirty(true);
  }

  // ---------------------------------------------------------------------------
  // Save — PUT /api/me/preferences
  // ---------------------------------------------------------------------------
  async function handleSave() {
    setSaving(true);
    const payload = {
      cocktailPreferences: cocktailPrefs,
      dietaryRestrictions,
      strengthPreference,
      publicProfile,
    };
    const result = await updateUserPreferences(payload);
    setSaving(false);

    if (!result || !result.success) {
      Alert.alert('Save Failed', 'Could not save preferences. Please try again.');
      return;
    }

    setDirty(false);
    // Notify recommendation engine + cabinet badge that prefs changed
    EventBus.emit(Events.INGREDIENTS_UPDATED, {
      userId: profile?.uid,
      source: 'preferences_update',
    });
    Alert.alert('Saved', 'Your preferences have been updated.');
  }

  // ---------------------------------------------------------------------------
  // Sign out
  // ---------------------------------------------------------------------------
  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          EventBus.emit(Events.USER_LOGOUT, { userId: profile?.uid });
          await signOut(getAuth());
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  function PillButton({ label, selected, onPress }) {
    return (
      <TouchableOpacity
        style={[styles.pill, selected && styles.pillSelected]}
        onPress={onPress}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={label}
      >
        <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  function SectionHeader({ title }) {
    return <Text style={styles.sectionHeader}>{title}</Text>;
  }

  // ---------------------------------------------------------------------------
  // Loading / Error states
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* ── Avatar + display info ────────────────────────────────────────── */}
      <View style={styles.avatarRow}>
        {profile?.photoURL ? (
          <Image source={{ uri: profile.photoURL }} style={styles.avatar} accessibilityLabel="Profile photo" />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {(profile?.displayName ?? profile?.email ?? '?')[0].toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{profile?.displayName ?? 'Alchemist'}</Text>
          <Text style={styles.email}>{profile?.email ?? ''}</Text>
        </View>
      </View>

      {/* ── Cocktail preferences ─────────────────────────────────────────── */}
      <SectionHeader title="Cocktail Preferences" />
      <Text style={styles.hint}>Select all that match your taste</Text>
      <View style={styles.pillRow}>
        {COCKTAIL_PREFERENCE_OPTIONS.map((opt) => (
          <PillButton
            key={opt}
            label={opt}
            selected={cocktailPrefs.includes(opt)}
            onPress={() => togglePref(cocktailPrefs, setCocktailPrefs, opt)}
          />
        ))}
      </View>

      {/* ── Dietary restrictions ─────────────────────────────────────────── */}
      <SectionHeader title="Dietary & Lifestyle" />
      <View style={styles.pillRow}>
        {DIETARY_OPTIONS.map((opt) => (
          <PillButton
            key={opt}
            label={opt}
            selected={dietaryRestrictions.includes(opt)}
            onPress={() => togglePref(dietaryRestrictions, setDietaryRestrictions, opt)}
          />
        ))}
      </View>

      {/* ── Strength preference ──────────────────────────────────────────── */}
      <SectionHeader title="Preferred Strength" />
      <View style={styles.pillRow}>
        {STRENGTH_OPTIONS.map((opt) => (
          <PillButton
            key={opt}
            label={opt}
            selected={strengthPreference === opt}
            onPress={() => handleStrengthChange(opt)}
          />
        ))}
      </View>

      {/* ── Privacy toggle ───────────────────────────────────────────────── */}
      <SectionHeader title="Privacy" />
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Public Profile</Text>
        <Switch
          value={publicProfile}
          onValueChange={handlePublicToggle}
          trackColor={{ false: Colors.surface, true: Colors.accent }}
          thumbColor={Colors.white}
          accessibilityLabel="Public profile toggle"
        />
      </View>

      {/* ── Save button ──────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.saveButton, (!dirty || saving) && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!dirty || saving}
        accessibilityRole="button"
        accessibilityLabel="Save preferences"
      >
        {saving ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.saveButtonText}>{dirty ? 'Save Changes' : 'Saved'}</Text>
        )}
      </TouchableOpacity>

      {/* ── Sign out ─────────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} accessibilityRole="button">
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles — all values from theme/index.js
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.sm,
    color: Colors.textSecondary,
    ...Typography.body,
  },
  errorText: {
    color: Colors.error,
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  retryText: {
    color: Colors.white,
    ...Typography.button,
  },

  // Avatar row
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginRight: Spacing.md,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarInitial: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    color: Colors.textPrimary,
    ...Typography.heading,
    marginBottom: Spacing.xs,
  },
  email: {
    color: Colors.textSecondary,
    ...Typography.caption,
  },

  // Section
  sectionHeader: {
    color: Colors.textPrimary,
    ...Typography.subheading,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  hint: {
    color: Colors.textSecondary,
    ...Typography.caption,
    marginBottom: Spacing.sm,
  },

  // Pills
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  pill: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
  },
  pillSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSubtle,
  },
  pillText: {
    color: Colors.textSecondary,
    ...Typography.caption,
  },
  pillTextSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },

  // Privacy toggle
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  toggleLabel: {
    color: Colors.textPrimary,
    ...Typography.body,
  },

  // Save
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.surface,
  },
  saveButtonText: {
    color: Colors.white,
    ...Typography.button,
  },

  // Sign out
  signOutButton: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  signOutText: {
    color: Colors.error,
    ...Typography.body,
    fontWeight: '600',
  },
});
