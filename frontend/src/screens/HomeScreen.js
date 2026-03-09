// Alchemy AI — Home Screen
// Sprint 1: Placeholder layout. Sprint 2+ will populate from AI recommendation engine.

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

// Placeholder cocktail data — replace with API/DB call in Sprint 3
const PLACEHOLDER_COCKTAILS = [
  { id: '1', name: 'Smoked Negroni', tag: 'Classic Twist' },
  { id: '2', name: 'Yuzu Highball', tag: 'Refreshing' },
  { id: '3', name: 'Velvet Sour', tag: 'Smooth' },
];

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.greeting}>Good evening</Text>
      <Text style={styles.subtitle}>What are you in the mood for?</Text>

      <Text style={styles.sectionTitle}>Featured Tonight</Text>

      {PLACEHOLDER_COCKTAILS.map((c) => (
        <View key={c.id} style={styles.card}>
          <Text style={styles.cardTag}>{c.tag}</Text>
          <Text style={styles.cardName}>{c.name}</Text>
        </View>
      ))}

      <View style={styles.badge}>
        <Text style={styles.badgeText}>Sprint 1 skeleton — data integration coming Sprint 3</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', padding: 20 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#F5F0E8', marginTop: 40 },
  subtitle: { fontSize: 14, color: '#8A8A8A', marginTop: 4, marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#F5F0E8', marginBottom: 16 },
  card: { backgroundColor: '#1C1C1C', padding: 20, borderRadius: 12, marginBottom: 12 },
  cardTag: { fontSize: 12, color: '#C9A84C', marginBottom: 6 },
  cardName: { fontSize: 20, fontWeight: 'bold', color: '#F5F0E8' },
  badge: { marginTop: 20, padding: 12, borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 8, alignItems: 'center' },
  badgeText: { fontSize: 12, color: '#4A4A4A' },
});
