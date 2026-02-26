// src/screens/HomeScreen.js
// Alchemy AI — Home Screen (Skeleton)
// Sprint 1: Placeholder layout. Sprint 2+ will populate from AI recommendation engine.

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.62;

// Placeholder cocktail data — replace with API/DB call in Sprint 3
const PLACEHOLDER_COCKTAILS = [
  { id: '1', name: 'Smoked Negroni',    tag: 'Bitter · Strong',   color: '#3D1A0A' },
  { id: '2', name: 'Yuzu Highball',     tag: 'Citrus · Light',    color: '#0A2D1A' },
  { id: '3', name: 'Velvet Sour',       tag: 'Smooth · Balanced', color: '#1A0A2D' },
];

export default function HomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 600, useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good evening</Text>
            <Text style={styles.headerTitle}>What's in your cabinet?</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Section: Featured ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured tonight</Text>
          <Text style={styles.sectionLink}>See all</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardRow}
        >
          {PLACEHOLDER_COCKTAILS.map((item) => (
            <TouchableOpacity key={item.id} style={[styles.card, { backgroundColor: item.color }]}>
              <View style={styles.cardOverlay} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTag}>{item.tag}</Text>
                <Text style={styles.cardName}>{item.name}</Text>
                <View style={styles.cardAction}>
                  <Text style={styles.cardActionText}>View recipe</Text>
                  <Ionicons name="arrow-forward" size={14} color={Colors.accent} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Section: Quick Actions ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Search')}
          >
            <Ionicons name="search-outline" size={24} color={Colors.accent} />
            <Text style={styles.actionLabel}>Search by ingredient</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="scan-outline" size={24} color={Colors.accent} />
            <Text style={styles.actionLabel}>Scan a bottle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="people-outline" size={24} color={Colors.accent} />
            <Text style={styles.actionLabel}>Party mode</Text>
          </TouchableOpacity>
        </View>

        {/* Sprint placeholder notice */}
        <View style={styles.sprintBadge}>
          <Ionicons name="construct-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.sprintText}>Sprint 1 skeleton — data integration coming Sprint 3</Text>
        </View>

      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll:    { paddingBottom: Spacing.xxl },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  greeting: { ...Typography.label, marginBottom: 4 },
  headerTitle: { ...Typography.heading, fontSize: 20 },
  notifBtn: {
    width: 40, height: 40,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  sectionTitle: { ...Typography.body, fontFamily: 'DMSans_500Medium', fontSize: 16 },
  sectionLink:  { ...Typography.bodySmall, color: Colors.accent },

  // Horizontal card row
  cardRow: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  card: {
    width: CARD_WIDTH,
    height: 200,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cardContent: { padding: Spacing.md },
  cardTag: { ...Typography.label, color: Colors.accent, marginBottom: 4 },
  cardName: { ...Typography.heading, fontSize: 18, marginBottom: Spacing.sm },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardActionText: { ...Typography.bodySmall, color: Colors.accent },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionLabel: { ...Typography.bodySmall, textAlign: 'center', lineHeight: 16 },

  // Sprint badge
  sprintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sprintText: { ...Typography.bodySmall, color: Colors.textMuted, fontSize: 11 },
});
