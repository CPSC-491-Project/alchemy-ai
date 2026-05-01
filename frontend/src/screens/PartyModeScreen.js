// src/screens/PartyModeScreen.js
// SCRUM-225: Party Mode screen — group cocktail planning tool.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Share,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, CormorantGaramond_300Light } from '@expo-google-fonts/cormorant-garamond';
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';

import CocktailCard from '../components/CocktailCard';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { filterByIngredient } from '../services/cocktailService';
import { useMixer } from '../contexts/MixerContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const GUEST_MIN = 2;
const GUEST_MAX = 10;
const FLAVOR_CHIPS = ['Classic', 'Citrus', 'Strong', 'Fruity', 'Mocktail'];

const FLAVOR_INGREDIENT_MAP = {
  Citrus:  'Lemon',
  Strong:  'Whiskey',
  Fruity:  'Peach Schnapps',
  Mocktail:'Lime juice',
  Classic: 'Gin',
};

const CARD_W = 165;
const CARD_GAP = 12;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function mapApiDrink(drink, index) {
  return {
    id:        drink.id    ?? `api-${index}`,
    imageUri:  drink.thumb ?? drink.image ?? null,
    drinkName: drink.name  ?? 'Unknown',
    tags:      [drink.category, drink.alcoholic].filter(Boolean),
    rating:    null,
    matchPct:  null,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PartyModeScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  const insets = useSafeAreaInsets();
  const { items: mixerItems } = useMixer();

  const [guestCount, setGuestCount]           = useState(4);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [cocktails, setCocktails]             = useState([]);
  const [loading, setLoading]                 = useState(false);

  // ── Fetch recommended cocktails whenever flavor selection changes ──────────
  useEffect(() => {
    let cancelled = false;

    async function fetchCocktails() {
      setLoading(true);
      try {
        const firstFlavor = selectedFlavors[0] ?? 'Classic';
        const ingredient  = FLAVOR_INGREDIENT_MAP[firstFlavor] ?? 'Gin';
        const results     = await filterByIngredient(ingredient);
        if (!cancelled) {
          setCocktails((results || []).map(mapApiDrink));
        }
      } catch {
        if (!cancelled) setCocktails([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCocktails();
    return () => { cancelled = true; };
  }, [selectedFlavors]);

  // ── Flavor chip toggle ─────────────────────────────────────────────────────
  const toggleFlavor = useCallback((flavor) => {
    setSelectedFlavors((prev) =>
      prev.includes(flavor) ? prev.filter((f) => f !== flavor) : [...prev, flavor]
    );
  }, []);

  // ── Guest count helpers ────────────────────────────────────────────────────
  const decrement = useCallback(() =>
    setGuestCount((n) => Math.max(GUEST_MIN, n - 1)), []);
  const increment = useCallback(() =>
    setGuestCount((n) => Math.min(GUEST_MAX, n + 1)), []);

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    const picks = cocktails.slice(0, 3).map((c) => '• ' + c.drinkName).join('\n');
    try {
      await Share.share({
        message: `Tonight's cocktail picks for ${guestCount} guests:\n${picks || '• No picks yet'}\n\nPowered by Alchemy AI 🍹`,
      });
    } catch {
      // Share dialog dismissed — no-op
    }
  }, [cocktails, guestCount]);

  // ── Font guard (after ALL hooks) ───────────────────────────────────────────
  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={Colors.accent} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>Party Mode</Text>
          <Text style={styles.subtitle}>Plan drinks for everyone</Text>
        </View>

        {/* Spacer to balance the back button */}
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Guest Count ──────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>How many guests?</Text>
          <View style={styles.countRow}>
            <TouchableOpacity
              style={[styles.countBtn, guestCount <= GUEST_MIN && styles.countBtnDisabled]}
              onPress={decrement}
              disabled={guestCount <= GUEST_MIN}
              accessibilityLabel="Decrease guest count"
            >
              <Ionicons
                name="remove"
                size={20}
                color={guestCount <= GUEST_MIN ? Colors.textFaint : Colors.accent}
              />
            </TouchableOpacity>

            <Text style={styles.countNumber}>{guestCount}</Text>

            <TouchableOpacity
              style={[styles.countBtn, guestCount >= GUEST_MAX && styles.countBtnDisabled]}
              onPress={increment}
              disabled={guestCount >= GUEST_MAX}
              accessibilityLabel="Increase guest count"
            >
              <Ionicons
                name="add"
                size={20}
                color={guestCount >= GUEST_MAX ? Colors.textFaint : Colors.accent}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Flavor Preferences ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>What are you in the mood for?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {FLAVOR_CHIPS.map((chip) => {
              const active = selectedFlavors.includes(chip);
              return (
                <TouchableOpacity
                  key={chip}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleFlavor(chip)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {chip}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Recommended For The Group ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Recommended For The Group</Text>

          {loading ? (
            <ActivityIndicator
              size="small"
              color={Colors.accent}
              style={styles.spinner}
            />
          ) : cocktails.length === 0 ? (
            <Text style={styles.emptyText}>
              No cocktails found — try a different mood
            </Text>
          ) : (
            <FlatList
              data={cocktails}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.flatListContent}
              ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
              renderItem={({ item }) => (
                <CocktailCard
                  imageUri={item.imageUri}
                  drinkName={item.drinkName}
                  tags={item.tags}
                  rating={item.rating}
                  matchPct={item.matchPct}
                  onPress={() =>
                    navigation.navigate('CocktailDetail', { cocktailId: item.id })
                  }
                  style={{ width: CARD_W }}
                />
              )}
            />
          )}
        </View>

        {/* ── Mixer Space ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Your Mixer Space</Text>

          {mixerItems.length === 0 ? (
            <Text style={styles.emptyText}>
              Add ingredients to your Mixer Space on the Create tab for personalized group picks
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mixerPillsRow}
            >
              {mixerItems.map((item) => (
                <View key={item.id} style={styles.mixerPill}>
                  <Text style={styles.mixerPillText}>{item.name}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* ── Share Button (fixed bottom) ───────────────────────────────────── */}
      <View style={[styles.shareWrapper, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity onPress={handleShare} activeOpacity={0.85}>
          <LinearGradient
            colors={[Colors.goldGradientStart, Colors.goldGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareBtn}
          >
            <Ionicons name="share-social-outline" size={18} color={Colors.background} />
            <Text style={styles.shareBtnText}>Share With Group</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 36,
  },
  title: {
    ...Typography.headingM,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.lg,
  },

  // ── Sections ────────────────────────────────────────────────────────────────
  section: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  sectionLabel: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    ...Typography.sectionHeader,
    color: Colors.textFaint,
    marginBottom: Spacing.md,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // ── Guest Count ─────────────────────────────────────────────────────────────
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  countBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBtnDisabled: {
    borderColor: Colors.textFaint,
    opacity: 0.4,
  },
  countNumber: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 48,
    color: Colors.accent,
    lineHeight: 54,
    minWidth: 56,
    textAlign: 'center',
  },

  // ── Flavor Chips ────────────────────────────────────────────────────────────
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: Colors.accent,
  },
  chipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.accent,
  },
  chipTextActive: {
    color: Colors.background,
  },

  // ── Recommended ─────────────────────────────────────────────────────────────
  flatListContent: {
    paddingRight: Spacing.md,
  },
  spinner: {
    marginTop: Spacing.lg,
    alignSelf: 'center',
  },
  emptyText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // ── Mixer Pills ─────────────────────────────────────────────────────────────
  mixerPillsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  mixerPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentSubtle,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  mixerPillText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.accent,
  },

  // ── Share Button ─────────────────────────────────────────────────────────────
  shareWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    borderRadius: Radius.lg,
  },
  shareBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.background,
    letterSpacing: 0.3,
  },
});
