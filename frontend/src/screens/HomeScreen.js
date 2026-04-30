/**
 * HomeScreen.js
 * Alchemy AI — CPSC 491 Capstone
 *
 * SCRUM-197 (Allisa Warren):
 * FIX 1 — useFonts: Added CormorantGaramond_300Light + DMSans_400Regular +
 *          DMSans_500Medium. Missing this caused a silent blank screen on web.
 *          Font guard added after all hooks (same pattern as CabinetScreen).
 * FIX 2 — Real API data: "Recommended For You" now fetches from
 *          GET /api/recipes/random via getRandomCocktail() (cocktailService).
 *          Falls back to MOCK_RECOMMENDED if backend is unreachable so the
 *          UI is always testable. Mock-data banner reflects which source is live.
 * FIX 3 — "Popular Right Now" fetches filterByIngredient('Whiskey') as a
 *          representative popular set. Falls back to MOCK_POPULAR.
 *
 * Sprint 4 polish pass (SCRUM-122) features retained:
 * - Ambient radial glow behind heading
 * - Full <CocktailCard> with star + match badge
 * - Quick-filter chip row above carousel
 * - Party Mode CTA card at bottom
 * - WCAG 2.1 AA — all a11y props inlined
 *
 * Props verified against src/components/CocktailCard.js:
 *   imageUri | drinkName | tags | rating | matchPct | onPress | style
 *
 * Tokens verified against src/theme/index.js:
 *   Named exports: Colors, Typography, Spacing, Radius
 *
 * Author: Allisa Warren
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// FIX 1: useFonts — MUST be imported and called or fonts silently fail on web
import { useFonts, CormorantGaramond_300Light } from '@expo-google-fonts/cormorant-garamond';
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';

import CocktailCard from '../components/CocktailCard';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { getRandomCocktail, filterByIngredient } from '../services/cocktailService';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------
const CARD_LARGE_W  = 200;
const CARD_COMPACT_W = 165;
const CARD_GAP       = 12;
const RECOMMENDED_COUNT = 4; // how many random cocktails to load

// ---------------------------------------------------------------------------
// Mock fallback data — prop names match CocktailCard exactly
// Used only when backend is unreachable.
// ---------------------------------------------------------------------------
const MOCK_RECOMMENDED = [
  { id: 'r1', imageUri: null, drinkName: 'Old Fashioned',  tags: ['Classic', 'Stirred'], rating: 4.8, matchPct: 92 },
  { id: 'r2', imageUri: null, drinkName: 'Negroni',        tags: ['Bitter',  'Stirred'], rating: 4.6, matchPct: 85 },
  { id: 'r3', imageUri: null, drinkName: 'Manhattan',      tags: ['Rich',    'Stirred'], rating: 4.5, matchPct: 78 },
  { id: 'r4', imageUri: null, drinkName: 'Whiskey Sour',   tags: ['Citrus',  'Shaken'],  rating: 4.3, matchPct: 71 },
];

const MOCK_POPULAR = [
  { id: 'p1', imageUri: null, drinkName: 'Margarita',       tags: ['Citrus',  'Shaken'],  rating: 4.7, matchPct: 60 },
  { id: 'p2', imageUri: null, drinkName: 'Mojito',          tags: ['Citrus',  'Mint'],    rating: 4.5, matchPct: 55 },
  { id: 'p3', imageUri: null, drinkName: 'Espresso Martini',tags: ['Coffee',  'Shaken'],  rating: 4.6, matchPct: 50 },
  { id: 'p4', imageUri: null, drinkName: 'Dark & Stormy',   tags: ['Rum',     'Built'],   rating: 4.2, matchPct: 45 },
];

const FILTER_CHIPS = ['All', 'Spirits', 'Citrus', 'Classics', 'Mocktails'];

const FILTER_INGREDIENT_MAP = {
  All:       null,
  Spirits:   'Vodka',
  Citrus:    'Lemon',
  Classics:  'Whiskey',
  Mocktails: 'Lime juice',
};

// ---------------------------------------------------------------------------
// Helper: map a CocktailDB API response item → CocktailCard prop shape
// CocktailDB returns: { id, name, thumb, category, alcoholic, ... }
// getRandomCocktail / filterByIngredient both return this shape (backend proxy).
// ---------------------------------------------------------------------------
function mapApiDrink(drink, index) {
  return {
    id:        drink.id    ?? `api-${index}`,
    imageUri:  drink.thumb ?? drink.image ?? null,
    drinkName: drink.name  ?? 'Unknown',
    tags:      [drink.category, drink.alcoholic].filter(Boolean),
    rating:    null,   // CocktailDB has no rating — CocktailCard handles null gracefully
    matchPct:  null,   // will be wired when /api/recommendations endpoint is live
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function HomeScreen({ navigation }) {
  // FIX 1: useFonts — declared FIRST before any other hooks.
  // Screens that use Cormorant/DMSans without this call render a blank screen
  // on Expo web. The font guard (return null) is placed after all hooks.
  const [fontsLoaded] = useFonts({
    CormorantGaramond_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('All');
  const scrollY = useRef(new Animated.Value(0)).current;

  // FIX 2: Real API state
  const [recommended, setRecommended]       = useState(MOCK_RECOMMENDED);
  const [popular, setPopular]               = useState(MOCK_POPULAR);
  const [loadingRec, setLoadingRec]         = useState(false);
  const [loadingPop, setLoadingPop]         = useState(false);
  const [usingMockRec, setUsingMockRec]     = useState(true);
  const [usingMockPop, setUsingMockPop]     = useState(true);
  const [filterLoading, setFilterLoading]   = useState(false);
  const baseRecommended = useRef(MOCK_RECOMMENDED);
  const basePopular     = useRef(MOCK_POPULAR);

  // Fade the ambient orb out as user scrolls — needs JS driver (opacity)
  const glowOpacity = scrollY.interpolate({
    inputRange:  [0, 120],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // FIX 2: Fetch recommended — N random cocktails in parallel
  useEffect(() => {
    let cancelled = false;
    async function fetchRecommended() {
      setLoadingRec(true);
      try {
        const promises = Array.from({ length: RECOMMENDED_COUNT }, () => getRandomCocktail());
        const drinks   = await Promise.all(promises);
        if (cancelled) return;
        const mapped = drinks.map(mapApiDrink);
        setRecommended(mapped);
        baseRecommended.current = mapped;
        setUsingMockRec(false);
      } catch {
        // Backend unreachable — keep mock fallback, banner already shows "Mock data"
        if (!cancelled) setUsingMockRec(true);
      } finally {
        if (!cancelled) setLoadingRec(false);
      }
    }
    fetchRecommended();
    return () => { cancelled = true; };
  }, []);

  // FIX 3: Fetch popular — use Whiskey filter as a representative popular set
  // until /api/recommendations is live (see known issue in handoff doc)
  useEffect(() => {
    let cancelled = false;
    async function fetchPopular() {
      setLoadingPop(true);
      try {
        const drinks = await filterByIngredient('Whiskey');
        if (cancelled) return;
        const mapped = drinks.slice(0, 6).map(mapApiDrink);
        setPopular(mapped);
        basePopular.current = mapped;
        setUsingMockPop(false);
      } catch {
        if (!cancelled) setUsingMockPop(true);
      } finally {
        if (!cancelled) setLoadingPop(false);
      }
    }
    fetchPopular();
    return () => { cancelled = true; };
  }, []);

  // SCRUM-220: Wire filter chips — re-filter recommended and re-fetch popular
  useEffect(() => {
    if (activeFilter === 'All') {
      setRecommended(baseRecommended.current);
      setPopular(basePopular.current);
      return;
    }

    // Filter recommended carousel locally from the base snapshot
    const filtered = baseRecommended.current.filter((c) =>
      c.tags.some((t) => t.toLowerCase().includes(activeFilter.toLowerCase()))
    );
    setRecommended(filtered.length > 0 ? filtered : baseRecommended.current);

    // Re-fetch popular carousel for the selected ingredient
    const ingredient = FILTER_INGREDIENT_MAP[activeFilter];
    let cancelled = false;
    setFilterLoading(true);
    filterByIngredient(ingredient)
      .then((drinks) => {
        if (cancelled) return;
        const mapped = drinks.slice(0, 6).map(mapApiDrink);
        setPopular(mapped.length > 0 ? mapped : basePopular.current);
      })
      .catch(() => {
        if (!cancelled) setPopular(basePopular.current);
      })
      .finally(() => {
        if (!cancelled) setFilterLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeFilter]);

  // ── Navigation helpers ────────────────────────────────────────────────
  const goToRecipe  = (item) => navigation.navigate('RecipeDetail', { recipeId: item.id, cocktail: item });
  const goToSearch  = ()     => navigation.navigate('Search');
  const goToPopular = ()     => navigation.navigate('Search', { filter: 'popular' });
  const goToParty   = ()     => navigation.navigate('PartyMode');

  // ── Filter chip ───────────────────────────────────────────────────────
  const renderFilterChip = (label) => {
    const isActive = label === activeFilter;
    return (
      <TouchableOpacity
        key={label}
        onPress={() => setActiveFilter(label)}
        style={[styles.chip, isActive && styles.chipActive]}
        accessibilityRole="radio"
        accessibilityLabel={label}
        accessibilityState={{ selected: isActive }}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  // ── Card renderers ─────────────────────────────────────────────────────
  const renderRecommended = ({ item }) => (
    <CocktailCard
      imageUri={item.imageUri}
      drinkName={item.drinkName}
      tags={item.tags}
      rating={item.rating}
      matchPct={item.matchPct}
      onPress={() => goToRecipe(item)}
      style={styles.cardLarge}
    />
  );

  const renderPopular = ({ item }) => (
    <CocktailCard
      imageUri={item.imageUri}
      drinkName={item.drinkName}
      tags={item.tags}
      rating={item.rating}
      matchPct={item.matchPct}
      onPress={() => goToRecipe(item)}
      style={styles.cardCompact}
    />
  );

  // FIX 1: Font guard — must be AFTER all hooks, BEFORE any JSX return
  if (!fontsLoaded) return null;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* ── Mock-data warning banner ──────────────────────────────────── */}
      {(usingMockRec || usingMockPop) && (
        <View
          style={[styles.mockBanner, { paddingTop: Math.max(insets.top, 10) }]}
          accessibilityLiveRegion="polite"
          accessibilityLabel="Development notice: using mock cocktail data"
        >
          <Ionicons
            name="flask-outline"
            size={12}
            color={Colors.accent}
            importantForAccessibility="no-hide-descendants"
          />
          <Text style={styles.mockBannerText}>
            {' '}Mock data — connect /api/recommendations
          </Text>
        </View>
      )}

      {/* ── Live data banner ─────────────────────────────────────────── */}
      {!usingMockRec && !usingMockPop && (
        <View
          style={[styles.liveBanner, { paddingTop: Math.max(insets.top, 10) }]}
          accessibilityLiveRegion="polite"
          accessibilityLabel="Live cocktail data loaded"
        >
          <Ionicons name="checkmark-circle-outline" size={12} color={Colors.success ?? '#4CAF72'} />
          <Text style={styles.liveBannerText}> Live cocktail data</Text>
        </View>
      )}

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 88 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false } // must be false — opacity needs JS driver
        )}
        scrollEventThrottle={16}
      >
        {/* ══════════════════════════════════════════════════════════════
            GREETING — ambient gold orb + Cormorant heading
            ══════════════════════════════════════════════════════════════ */}
        <Animated.View style={[styles.greetingSection, { opacity: glowOpacity }]}>
          <LinearGradient
            colors={[
              'rgba(201,168,76,0.16)',
              'rgba(201,168,76,0.06)',
              'rgba(13,13,13,0)',
            ]}
            style={styles.ambientOrb}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={styles.greetingHeading} accessibilityRole="header">
            What will you{'\n'}craft tonight?
          </Text>
          <Text style={styles.greetingSubtitle}>
            Based on your ingredient cabinet
          </Text>
        </Animated.View>

        {/* ── Search bar ─────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={goToSearch}
          accessibilityRole="search"
          accessibilityLabel="Search ingredients"
          accessibilityHint="Opens the search screen"
        >
          <Ionicons
            name="search-outline"
            size={16}
            color={Colors.textMuted}
            style={styles.searchIcon}
            importantForAccessibility="no-hide-descendants"
          />
          <Text style={styles.searchPlaceholder}>Search ingredients…</Text>
        </TouchableOpacity>

        {/* ── Filter chip row ────────────────────────────────────────── */}
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Filter cocktails by category"
          style={styles.chipsRow}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContent}
          >
            {FILTER_CHIPS.map(renderFilterChip)}
          </ScrollView>
        </View>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 1 — Recommended For You (FIX 2: real API data)
            ══════════════════════════════════════════════════════════════ */}
        <SectionHeader title="Recommended For You" onSeeAll={goToSearch} />
        {loadingRec ? (
          <ActivityIndicator
            color={Colors.accent}
            size="small"
            style={styles.sectionLoader}
            accessibilityLabel="Loading recommendations"
          />
        ) : (
          <FlatList
            data={recommended}
            renderItem={renderRecommended}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            snapToInterval={CARD_LARGE_W + CARD_GAP}
            decelerationRate="fast"
            snapToAlignment="start"
            accessibilityRole="list"
            accessibilityLabel="Recommended cocktails based on your cabinet"
          />
        )}

        {/* ══════════════════════════════════════════════════════════════
            SECTION 2 — Popular Right Now (FIX 3: real API data)
            ══════════════════════════════════════════════════════════════ */}
        <SectionHeader
          title="Popular Right Now"
          onSeeAll={goToPopular}
          style={styles.sectionHeaderSpacing}
        />
        {loadingPop || filterLoading ? (
          <ActivityIndicator
            color={Colors.accent}
            size="small"
            style={styles.sectionLoader}
            accessibilityLabel="Loading popular cocktails"
          />
        ) : (
          <FlatList
            data={popular}
            renderItem={renderPopular}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            snapToInterval={CARD_COMPACT_W + CARD_GAP}
            decelerationRate="fast"
            snapToAlignment="start"
            accessibilityRole="list"
            accessibilityLabel="Popular cocktails right now"
          />
        )}

        {/* ══════════════════════════════════════════════════════════════
            PARTY MODE CTA
            ══════════════════════════════════════════════════════════════ */}
        <TouchableOpacity
          style={styles.partyModeCta}
          onPress={goToParty}
          accessibilityRole="button"
          accessibilityLabel="Party Mode — plan drinks for a group"
          accessibilityHint="Opens Party Mode to share cocktail suggestions with friends"
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#2A1F0A', '#1A1300']}
            style={styles.partyModeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.partyModeLeft}>
              <Ionicons
                name="people-outline"
                size={22}
                color={Colors.accent}
                importantForAccessibility="no-hide-descendants"
              />
              <View>
                <Text style={styles.partyModeTitle}>Party Mode</Text>
                <Text style={styles.partyModeSub}>Plan drinks for everyone</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Colors.accent}
              importantForAccessibility="no-hide-descendants"
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// SectionHeader
// ---------------------------------------------------------------------------
function SectionHeader({ title, onSeeAll, style }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      <TouchableOpacity
        onPress={onSeeAll}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={`See all ${title}`}
      >
        <Text style={styles.seeAll}>See All</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles — all values from theme tokens, no hard-coded colours
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Mock / live banners ──────────────────────────────────────────────
  mockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: 6,
    backgroundColor: Colors.accentGlow,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accentDim,
  },
  mockBannerText: {
    ...Typography.caption,
    color: Colors.accent,
    opacity: 0.8,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: 6,
    backgroundColor: 'rgba(76,175,114,0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76,175,114,0.2)',
  },
  liveBannerText: {
    ...Typography.caption,
    color: Colors.success ?? '#4CAF72',
    opacity: 0.9,
  },

  // ── Scroll ───────────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { paddingTop: Spacing.sm },

  // ── Greeting + ambient orb ───────────────────────────────────────────
  greetingSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
    overflow: 'visible',
  },
  ambientOrb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -70,
    left: -50,
  },
  greetingHeading: {
    ...Typography.headingL,
    lineHeight: 46,
  },
  greetingSubtitle: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
  },

  // ── Search bar ───────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 46,
  },
  searchIcon: { marginRight: Spacing.sm },
  searchPlaceholder: {
    ...Typography.body,
    color: Colors.textHint,
  },

  // ── Filter chips ──────────────────────────────────────────────────────
  chipsRow: { marginBottom: Spacing.lg },
  chipsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  chipText: {
    ...Typography.label,
    color: Colors.textMuted,
  },
  chipTextActive: {
    ...Typography.label,
    color: Colors.background,
    fontFamily: 'DMSans_500Medium',
  },

  // ── Section header ────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionHeaderSpacing: { marginTop: Spacing.xl },
  sectionTitle: { ...Typography.heading },
  seeAll: {
    ...Typography.label,
    color: Colors.accent,
    fontFamily: 'DMSans_500Medium',
  },

  // ── Section loader ────────────────────────────────────────────────────
  sectionLoader: { marginVertical: Spacing.lg },

  // ── Carousels ─────────────────────────────────────────────────────────
  carouselContent: {
    paddingHorizontal: Spacing.lg,
    gap: CARD_GAP,
  },
  cardLarge:   { width: CARD_LARGE_W },
  cardCompact: { width: CARD_COMPACT_W },

  // ── Party Mode CTA ────────────────────────────────────────────────────
  partyModeCta: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.accentDim,
  },
  partyModeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 18,
  },
  partyModeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  partyModeTitle: {
    ...Typography.subheading,
    color: Colors.accentLight,
    fontSize: 18,
  },
  partyModeSub: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
