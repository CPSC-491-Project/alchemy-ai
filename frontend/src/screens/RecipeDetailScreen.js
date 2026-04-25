// =============================================================
// Alchemy AI — Recipe Detail Screen
// SCRUM-126 | feature/SCRUM-126-recipe-detail-screen | Allisa Warren
// Built to hi-fi wireframe spec — April 2026
// Wiring point: replace MOCK_COCKTAIL with live data from
//   GET /api/recipes/:id  (SCRUM-116) once that PR merges.
// =============================================================
import React, { useState } from 'react';
import { useFonts, CormorantGaramond_300Light } from '@expo-google-fonts/cormorant-garamond';
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, StatusBar,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';

// ------------------------------------------------------------------
// Mock data — swap for route.params.cocktail once SCRUM-116 merges
// ------------------------------------------------------------------
const MOCK_COCKTAIL = {
  id: '11007',
  name: 'Old Fashioned',
  badges: ['Bourbon', 'Neat', 'Classic'],
  difficulty: 'Intermediate',
  time: '5 min',
  ingredients: [
    { id: 'B', name: 'Bourbon Whiskey', measure: '60ml' },
    { id: 'S', name: 'Simple Syrup',    measure: '1 tsp' },
    { id: 'A', name: 'Angostura Bitters', measure: '2 dash' },
    { id: 'O', name: 'Orange Peel',     measure: '1 peel' },
  ],
  steps: [
    'Add simple syrup and bitters to a rocks glass.',
    'Add a large ice cube and pour bourbon over.',
    'Stir gently for 20–30 seconds until well chilled.',
    'Express an orange peel over the glass and use as garnish.',
  ],
};

// ------------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------------

const Badge = ({ label }) => (
  <View style={styles.badge}>
    <Text style={styles.badgeLabel}>{label}</Text>
  </View>
);

const DifficultyDots = ({ level }) => {
  // Intermediate = 2 filled, 1 empty  |  Easy = 1 | Hard = 3
  const total = 3;
  const filled = level === 'Easy' ? 1 : level === 'Hard' ? 3 : 2;
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.dot, i < filled && styles.dotFilled]} />
      ))}
    </View>
  );
};

const IngredientRow = ({ item }) => (
  <View style={styles.ingredientRow}>
    <View style={styles.ingredientAvatar}>
      <Text style={styles.ingredientAvatarText}>{item.id}</Text>
    </View>
    <Text style={styles.ingredientName}>{item.name}</Text>
    <Text style={styles.ingredientMeasure}>{item.measure}</Text>
  </View>
);

const StepRow = ({ index, text }) => (
  <View style={styles.stepRow}>
    <View style={styles.stepNumber}>
      <Text style={styles.stepNumberText}>{index + 1}</Text>
    </View>
    <Text style={styles.stepText}>{text}</Text>
  </View>
);

// ------------------------------------------------------------------
// Main screen
// ------------------------------------------------------------------
export default function RecipeDetailScreen({ navigation, route }) {
  // Once SCRUM-116 merges, replace MOCK_COCKTAIL with:
  const [fontsLoaded] = useFonts({ CormorantGaramond_300Light, DMSans_400Regular, DMSans_500Medium });
  const raw = route?.params?.cocktail ?? MOCK_COCKTAIL;
  const cocktail = {
    ...raw,
    badges: raw.badges ?? raw.tags ?? [],
    ingredients: Array.isArray(raw.ingredients)
      ? raw.ingredients
      : (raw.ingredients ?? '').split(' · ').map((name, i) => ({
          id: name[0].toUpperCase(),
          name,
          measure: '',
        })),
    steps: raw.steps ?? [],
  };

  const [activeTab, setActiveTab] = useState('Ingredients');
  const TABS = ['Ingredients', 'Steps'];
  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        
      >
        {/* ── Hero image area ─────────────────────────────────── */}
        <View style={styles.hero}>
          {/* Back arrow floats over hero */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          {/* Hero image placeholder — swap View for <Image> once wired */}
          <View style={styles.heroImage} />

          {/* Fade overlay at bottom of hero */}
          <View style={styles.heroFade} />
        </View>

        {/* ── Drink name + meta ────────────────────────────────── */}
        <View style={styles.metaBlock}>
          <Text style={styles.drinkName}>{cocktail.name}</Text>

          {/* Badge pills */}
          <View style={styles.badgeRow}>
            {cocktail.badges.map(b => <Badge key={b} label={b} />)}
          </View>

          {/* Difficulty dots + label + time */}
          <View style={styles.difficultyRow}>
            <DifficultyDots level={cocktail.difficulty} />
            <Text style={styles.difficultyLabel}>{cocktail.difficulty}</Text>
            <Text style={styles.timeLabel}>{cocktail.time}</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Tab row — Ingredients / Steps */}
          <View style={styles.tabRow}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                style={styles.tabItem}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                  {tab}
                </Text>
                {activeTab === tab && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Tab content ──────────────────────────────────────── */}
        <View style={styles.tabContent}>
          {activeTab === 'Ingredients' ? (
            <>
              {/* Column headers */}
              <View style={styles.ingredientHeader}>
                <Text style={styles.ingredientHeaderLabel}>Ingredients</Text>
                <View style={styles.ingredientHeaderRight}>
                  <Text style={styles.ingredientHeaderLabel}>Steps</Text>
                  <Text style={[styles.ingredientHeaderLabel, { marginLeft: Spacing.lg }]}>None</Text>
                </View>
              </View>

              {cocktail.ingredients.map(item => (
                <IngredientRow key={item.id} item={item} />
              ))}
            </>
          ) : (
            <>
              {cocktail.steps.map((step, i) => (
                <StepRow key={i} index={i} text={step} />
              ))}
            </>
          )}
        </View>

        {/* Bottom spacer so FAB doesn't overlap last row */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Floating action button ───────────────────────────── */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* ── Add All to Cabinet CTA ───────────────────────────── */}
      <View style={styles.ctaWrapper}>
        <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85}>
          <Text style={styles.ctaLabel}>Add All to Cabinet</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ------------------------------------------------------------------
// Styles — all tokens from theme/index.js, zero hardcoded values
// ------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Hero ────────────────────────────────────────────────────────
  hero: {
    width: '100%',
    height: 280,
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.lg,
    zIndex: 10,
  },
  backArrow: {
    color: Colors.accent,
    fontSize: 22,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surface,   // #1E1A14 warm dark brown
  },
  heroFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    // Simulates the hero fade overlay — fades into Colors.background
    backgroundColor: Colors.background,
    opacity: 0.85,
  },

  // ── Meta block ──────────────────────────────────────────────────
  metaBlock: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  drinkName: {
    ...Typography.display,                   // Cormorant Garamond, large
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  // Badges
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  badgeLabel: {
    ...Typography.label,
    color: Colors.accent,
  },

  // Difficulty
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: Colors.accent,
  },
  difficultyLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flex: 1,
  },
  timeLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  // Divider
  divider: {
    height: 0.5,
    backgroundColor: Colors.accent,
    opacity: 0.4,
    marginBottom: Spacing.md,
  },

  // ── Tab row ─────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  tabItem: {
    alignItems: 'center',
    paddingBottom: Spacing.xs,
  },
  tabLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
  },

  // ── Tab content ─────────────────────────────────────────────────
  tabContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },

  // Ingredient header row
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  ingredientHeaderRight: {
    flexDirection: 'row',
  },
  ingredientHeaderLabel: {
    ...Typography.label,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Ingredient rows
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  ingredientAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceRaised,
  },
  ingredientAvatarText: {
    ...Typography.bodySmall,
    color: Colors.accent,
    fontWeight: '500',
  },
  ingredientName: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  ingredientMeasure: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  // Step rows
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    ...Typography.label,
    color: Colors.accent,
    fontWeight: '500',
  },
  stepText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 22,
  },

  // ── FAB ─────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 90,
    right: Spacing.lg,
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    color: Colors.background,
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 28,
  },

  // ── Add All to Cabinet CTA ──────────────────────────────────────
  ctaWrapper: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
  },
  ctaButton: {
    backgroundColor: Colors.accent,   // swap for LinearGradient when expo-linear-gradient is confirmed
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    ...Typography.body,
    color: Colors.background,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
