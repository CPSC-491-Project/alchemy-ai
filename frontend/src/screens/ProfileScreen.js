// src/screens/ProfileScreen.js
// Alchemy AI — Profile Screen (Skeleton)
// Sprint 1: Static layout. Will populate from user session in Sprint 2.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';

const MENU_ITEMS = [
  { icon: 'wine-outline',        label: 'My Ingredient Cabinet', sprint: 2 },
  { icon: 'heart-outline',       label: 'Favorite Recipes',      sprint: 2 },
  { icon: 'time-outline',        label: 'Drink History',         sprint: 3 },
  { icon: 'notifications-outline', label: 'Notifications',       sprint: 3 },
  { icon: 'shield-outline',      label: 'Privacy & Security',    sprint: 2 },
  { icon: 'settings-outline',    label: 'Settings',              sprint: 2 },
];

export default function ProfileScreen({ navigation }) {
  const handleLogout = () => {
    // TODO Sprint 2: clear auth session, token, cached data
    navigation.replace('Login');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* ── Avatar / User Info ── */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={32} color={Colors.accent} />
        </View>
        <Text style={styles.name}>Guest User</Text>
        <Text style={styles.email}>Sign in for personalized recommendations</Text>
        <TouchableOpacity style={styles.signInPrompt} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.signInText}>Sign in with Google</Text>
          <Ionicons name="arrow-forward" size={14} color={Colors.accent} />
        </TouchableOpacity>
      </View>

      {/* ── Menu ── */}
      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name={item.icon} size={20} color={Colors.accent} />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.sprintTag}>S{item.sprint}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Logout ── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={Colors.error} />
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Alchemy AI · Sprint 1 Skeleton</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll:    { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  avatarSection: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.accentDim,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  name:     { ...Typography.heading, fontSize: 20 },
  email:    { ...Typography.bodySmall, textAlign: 'center' },
  signInPrompt: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.accentGlow,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.accentDim,
  },
  signInText: { ...Typography.bodySmall, color: Colors.accent },

  menu: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  menuLabel: { ...Typography.body },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sprintTag: { ...Typography.label, fontSize: 10, color: Colors.textMuted },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 14,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.error + '44',
  },
  logoutText: { ...Typography.button, color: Colors.error },

  version: { ...Typography.bodySmall, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
});
