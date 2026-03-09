// Alchemy AI — Profile Screen
// Sprint 1: Static layout. Will populate from user session in Sprint 2.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const MENU_ITEMS = [
  { label: 'My Ingredient Cabinet', sprint: 'Sprint 2' },
  { label: 'Favorite Recipes', sprint: 'Sprint 2' },
  { label: 'Drink History', sprint: 'Sprint 3' },
  { label: 'Notifications', sprint: 'Sprint 3' },
  { label: 'Privacy & Security', sprint: 'Sprint 2' },
  { label: 'Settings', sprint: 'Sprint 2' },
];

export default function ProfileScreen({ navigation }) {
  const handleSignOut = () => {
    // TODO Sprint 2: clear auth session, token, cached data
    navigation.replace('Login');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>G</Text>
        </View>
        <View>
          <Text style={styles.userName}>Guest User</Text>
          <Text style={styles.userSub}>Sign in to save your preferences</Text>
        </View>
      </View>

      {MENU_ITEMS.map((item) => (
        <View key={item.label} style={styles.menuItem}>
          <Text style={styles.menuLabel}>{item.label}</Text>
          <Text style={styles.menuSprint}>{item.sprint}</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Alchemy AI · Sprint 1 Skeleton</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#F5F0E8', marginTop: 40, marginBottom: 20 },
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1C',
    padding: 16, borderRadius: 12, marginBottom: 24, gap: 14,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#C9A84C', fontSize: 20, fontWeight: 'bold' },
  userName: { color: '#F5F0E8', fontSize: 16, fontWeight: '600' },
  userSub: { color: '#8A8A8A', fontSize: 13, marginTop: 2 },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1C1C1C',
  },
  menuLabel: { color: '#F5F0E8', fontSize: 15 },
  menuSprint: { color: '#4A4A4A', fontSize: 12 },
  signOutButton: {
    marginTop: 30, paddingVertical: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#CF6679', alignItems: 'center',
  },
  signOutText: { color: '#CF6679', fontSize: 15 },
  version: { color: '#4A4A4A', fontSize: 12, textAlign: 'center', marginTop: 24 },
});
