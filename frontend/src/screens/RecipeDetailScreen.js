// =============================================================
// Alchemy AI — Recipe Detail Screen
// SCRUM-126 | Allisa Warren | April 2026
//
// FIX (SCRUM-198): crash fix, full-fetch, ingredient normalization,
//   hero image fallback, FAB wired, column headers fixed.
// FIX (SCRUM-200): Heart favorite toggle added to hero area.
//   Tapping the heart icon toggles filled ↔ outline with a
//   scale-bounce animation. Local state only — persistence
//   queued for backend integration in final delivery week.
// =============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useFonts, CormorantGaramond_300Light } from '@expo-google-fonts/cormorant-garamond';
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { getCocktailById } from '../services/cocktailService';
// SCRUM-209: cabinet scan plumbing — same services CocktailDetailScreen uses.
import { getCabinet } from '../services/cabinetService';
import { compareCabinetToDrink } from '../utils/cabinetCoverage';
import { useAuth } from '../context/AuthContext';

// ------------------------------------------------------------------
// Mock fallback — used only when no route params provided
// ------------------------------------------------------------------
const MOCK_COCKTAIL = {
  id: '11007',
  name: 'Old Fashioned',
  badges: ['Bourbon', 'Neat', 'Classic'],
  difficulty: 'Intermediate',
  time: '5 min',
  ingredients: [
    { id: 'B', name: 'Bourbon Whiskey',   measure: '60ml'   },
    { id: 'S', name: 'Simple Syrup',      measure: '1 tsp'  },
    { id: 'A', name: 'Angostura Bitters', measure: '2 dash' },
    { id: 'O', name: 'Orange Peel',       measure: '1 peel' },
  ],
  steps: [
    'Add simple syrup and bitters to a rocks glass.',
    'Add a large ice cube and pour bourbon over.',
    'Stir gently for 20–30 seconds until well chilled.',
    'Express an orange peel over the glass and use as garnish.',
  ],
};

// ------------------------------------------------------------------
// Normalize ingredients into {id, name, measure} regardless of source
//   Shape A — already normalized : [{id, name, measure}]
//   Shape B — CocktailDB objects  : [{name, measure}]
//   Shape C — dot-separated string: "Rum · Lime · Mint"
// ------------------------------------------------------------------
function normalizeIngredients(raw) {
  if (!raw?.ingredients) return [];
  if (Array.isArray(raw.ingredients)) {
    return raw.ingredients.map((item, i) => {
      if (typeof item === 'string') {
        const t = item.trim();
        return { id: t[0]?.toUpperCase() ?? String(i + 1), name: t, measure: '' };
      }
      return {
        id:      item.id ?? item.name?.[0]?.toUpperCase() ?? String(i + 1),
        name:    item.name    ?? 'Unknown',
        measure: item.measure ?? '',
      };
    });
  }
  return String(raw.ingredients).split(' · ').map((part, i) => {
    const t = part.trim();
    return { id: t[0]?.toUpperCase() ?? String(i + 1), name: t, measure: '' };
  });
}

// ------------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------------
const Badge = ({ label }) => (
  <View style={styles.badge}>
    <Text style={styles.badgeLabel}>{label}</Text>
  </View>
);

const DifficultyDots = ({ level }) => {
  const total  = 3;
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
  const [fontsLoaded] = useFonts({
    CormorantGaramond_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  const passedCocktail = route?.params?.cocktail ?? MOCK_COCKTAIL;

  const isPartial =
    !passedCocktail.ingredients ||
    (Array.isArray(passedCocktail.ingredients) &&
      passedCocktail.ingredients.length === 0);

  const [cocktailData, setCocktailData] = useState(isPartial ? null : passedCocktail);
  const [loadingFull, setLoadingFull]   = useState(isPartial);
  const [fetchError, setFetchError]     = useState(null);
  const [activeTab, setActiveTab]       = useState('Ingredients');
  const [imageError, setImageError]     = useState(false);

  // ── SCRUM-200: Favorite toggle ──────────────────────────────────
  const [isFavorited, setIsFavorited] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;

  // ── SCRUM-209: Scan My Cabinet state (hooks at top, handlers below) ──
  const { isGuest } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);

  const handleFavoriteToggle = () => {
    // Bounce animation
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.4,
        useNativeDriver: true,
        speed: 50,
        bounciness: 8,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 4,
      }),
    ]).start();
    setIsFavorited((prev) => !prev);
  };

  // ── Fetch full detail when passed a partial record ───────────────
  useEffect(() => {
    if (!isPartial) return;
    let cancelled = false;
    async function fetchFull() {
      try {
        const id = passedCocktail.id ?? route?.params?.recipeId;
        if (!id) throw new Error('No cocktail ID available');
        const full = await getCocktailById(id);
        if (!cancelled) setCocktailData(full);
      } catch (err) {
        if (!cancelled) {
          setFetchError(err.message);
          setCocktailData(passedCocktail);
        }
      } finally {
        if (!cancelled) setLoadingFull(false);
      }
    }
    fetchFull();
    return () => { cancelled = true; };
  }, []);

  if (!fontsLoaded) return null;

  // Loading state — show name + spinner while fetching full detail
  if (loadingFull) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <View style={styles.hero}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.heroImage} />
          <View style={styles.heroFade} />
        </View>
        <View style={[styles.metaBlock, { alignItems: 'center', paddingTop: Spacing.xl }]}>
          <Text style={styles.drinkName}>{passedCocktail.name}</Text>
          <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  // Normalize
  const raw     = cocktailData ?? passedCocktail;
  const cocktail = {
    ...raw,
    badges:      raw.badges ?? raw.tags ?? [raw.category, raw.alcoholic].filter(Boolean),
    ingredients: normalizeIngredients(raw),
    steps:       raw.steps ?? (raw.instructions
                   ? raw.instructions.split(/\.\s+/).filter(Boolean).map((s) => s + '.')
                   : []),
    image:       raw.image ?? raw.thumb ?? null,
    difficulty:  raw.difficulty ?? 'Intermediate',
    time:        raw.time ?? '',
  };

  // Shared add-all action
  const handleAddAllToCabinet = () => {
    const names   = cocktail.ingredients.map((i) => i.name).filter(Boolean).join(', ');
    const message = names || cocktail.name;
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      window.alert('Added to Cabinet\n' + message);
    } else {
      Alert.alert('Added to Cabinet', message);
    }
  };

  // SCRUM-209: Scan My Cabinet — ported from CocktailDetailScreen so the
  // Home/Create flow exposes the same action as the Search/Favorites flow.
  // Reuses getCabinet() + compareCabinetToDrink() from SCRUM-204/205.
  // (Hooks are declared up-top with the rest; these are the handlers.)
  async function handleScan() {
    if (!cocktail) return;
    setScanning(true);
    setScanError(null);
    setScanResult(null);
    setScanModalOpen(true);
    try {
      const cabinet = await getCabinet();
      const result = compareCabinetToDrink(cabinet, cocktail.ingredients || []);
      setScanResult(result);
    } catch (err) {
      setScanError(err.message || 'Something went wrong scanning your cabinet.');
    } finally {
      setScanning(false);
    }
  }

  function closeScanModal() {
    setScanModalOpen(false);
    setScanResult(null);
    setScanError(null);
  }

  const TABS = ['Ingredients', 'Steps'];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Hero ──────────────────────────────────────── */}
        <View style={styles.hero}>
          {/* Back button — top left */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          {/* SCRUM-200: Heart button — top right */}
          <Animated.View style={[styles.heartBtn, { transform: [{ scale: heartScale }] }]}>
            <TouchableOpacity
              onPress={handleFavoriteToggle}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              accessibilityState={{ checked: isFavorited }}
            >
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={26}
                color={Colors.accent}
              />
            </TouchableOpacity>
          </Animated.View>

          {cocktail.image && !imageError ? (
            <Image
              source={{ uri: cocktail.image }}
              style={styles.heroImage}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.heroImage} />
          )}
          <View style={styles.heroFade} />
        </View>

        {/* ── Meta ──────────────────────────────────────── */}
        <View style={styles.metaBlock}>
          <Text style={styles.drinkName}>{cocktail.name}</Text>

          {cocktail.badges.length > 0 && (
            <View style={styles.badgeRow}>
              {cocktail.badges.map((b) => <Badge key={b} label={b} />)}
            </View>
          )}

          <View style={styles.difficultyRow}>
            <DifficultyDots level={cocktail.difficulty} />
            <Text style={styles.difficultyLabel}>{cocktail.difficulty}</Text>
            {!!cocktail.time && <Text style={styles.timeLabel}>{cocktail.time}</Text>}
          </View>

          {fetchError && (
            <Text style={styles.fetchErrorNote}>
              ⚠ Could not load full details — showing partial data.
            </Text>
          )}

          <View style={styles.divider} />

          <View style={styles.tabRow}>
            {TABS.map((tab) => (
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

        {/* ── Tab content ───────────────────────────────── */}
        <View style={styles.tabContent}>
          {activeTab === 'Ingredients' ? (
            <>
              <View style={styles.ingredientHeader}>
                <Text style={styles.ingredientHeaderLabel}>Ingredient</Text>
                <Text style={styles.ingredientHeaderLabel}>Measure</Text>
              </View>
              {cocktail.ingredients.length === 0 ? (
                <Text style={styles.emptyNote}>No ingredient data available.</Text>
              ) : (
                cocktail.ingredients.map((item, i) => (
                  <IngredientRow key={item.id ?? i} item={item} />
                ))
              )}
            </>
          ) : (
            <>
              {cocktail.steps.length === 0 ? (
                <Text style={styles.emptyNote}>No steps available.</Text>
              ) : (
                cocktail.steps.map((step, i) => (
                  <StepRow key={i} index={i} text={step} />
                ))
              )}
            </>
          )}
        </View>

        {/* ── SCRUM-209: Scan My Cabinet ── */}
        <View style={styles.scanButtonWrap}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={isGuest ? () => navigation.navigate('Login') : handleScan}
            accessibilityLabel={
              isGuest ? 'Sign in to scan your cabinet' : 'Scan my cabinet'
            }
            activeOpacity={0.8}
          >
            <Text style={styles.scanButtonText}>
              {isGuest ? 'Sign in to Scan My Cabinet' : 'Scan My Cabinet'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── FAB ───────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={handleAddAllToCabinet}
        accessibilityRole="button"
        accessibilityLabel="Add all ingredients to cabinet"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* ── Add All to Cabinet CTA ────────────────────── */}
      <View style={styles.ctaWrapper}>
        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.85}
          onPress={handleAddAllToCabinet}
          accessibilityRole="button"
          accessibilityLabel="Add all ingredients to cabinet"
        >
          <Text style={styles.ctaLabel}>Add All to Cabinet</Text>
        </TouchableOpacity>
      </View>

      {/* ── SCRUM-209: Scan Result Modal (mirrors CocktailDetailScreen) ── */}
      <Modal
        visible={scanModalOpen}
        animationType="fade"
        transparent
        onRequestClose={closeScanModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cabinet Match</Text>
              <TouchableOpacity
                onPress={closeScanModal}
                accessibilityLabel="Close"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {scanning ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator color={Colors.accent} size="large" />
                <Text style={styles.modalHint}>Scanning your cabinet…</Text>
              </View>
            ) : scanError ? (
              <View style={styles.modalCenter}>
                <Text style={styles.modalErrorText}>{scanError}</Text>
                <TouchableOpacity onPress={handleScan} style={styles.modalRetry}>
                  <Text style={styles.modalRetryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : scanResult ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalSummary}>
                  You have{' '}
                  <Text style={styles.modalSummaryAccent}>
                    {scanResult.matchedCount}
                  </Text>{' '}
                  of {scanResult.ingredientCount} ingredients
                  {scanResult.ingredientCount > 0
                    ? ` (${Math.round(scanResult.matchPercentage * 100)}%)`
                    : ''}
                </Text>

                {scanResult.matched.length > 0 && (
                  <>
                    <Text style={styles.modalSectionLabel}>You Have</Text>
                    {scanResult.matched.map((m, i) => (
                      <View key={`have-${i}`} style={styles.modalRow}>
                        <Text style={styles.modalCheck}>✓</Text>
                        <Text style={styles.modalRowText} numberOfLines={1}>
                          {m.drinkIngredient}
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                {scanResult.missing.length > 0 && (
                  <>
                    <Text style={styles.modalSectionLabel}>Missing</Text>
                    {scanResult.missing.map((name, i) => (
                      <View key={`miss-${i}`} style={styles.modalRow}>
                        <Text style={styles.modalCross}>✕</Text>
                        <Text style={styles.modalRowText} numberOfLines={1}>
                          {name}
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                {scanResult.matchedCount === 0 &&
                  scanResult.ingredientCount > 0 && (
                    <TouchableOpacity
                      style={styles.modalCabinetCta}
                      onPress={() => {
                        closeScanModal();
                        navigation.navigate('IngredientCabinet');
                      }}
                    >
                      <Text style={styles.modalCabinetCtaText}>
                        Add ingredients to your cabinet →
                      </Text>
                    </TouchableOpacity>
                  )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flexGrow: 1 },

  // ── Hero ──────────────────────────────────────────────────────────
  hero:    { width: '100%', height: 280, position: 'relative' },
  backBtn: {
    position: 'absolute', top: Spacing.md, left: Spacing.lg, zIndex: 10,
  },
  backArrow: { color: Colors.accent, fontSize: 22 },

  // SCRUM-200: heart button — top right of hero
  heartBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroImage: { width: '100%', height: '100%', backgroundColor: Colors.surface },
  heroFade:  {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
    backgroundColor: Colors.background, opacity: 0.85,
  },

  // ── Meta block ────────────────────────────────────────────────────
  metaBlock:      { backgroundColor: Colors.background, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  drinkName:      { ...Typography.display, color: Colors.textPrimary, marginBottom: Spacing.sm },
  badgeRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  badge:          { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.accent },
  badgeLabel:     { ...Typography.label, color: Colors.accent },
  difficultyRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  dotsRow:        { flexDirection: 'row', gap: 4 },
  dot:            { width: 8, height: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.accent, backgroundColor: 'transparent' },
  dotFilled:      { backgroundColor: Colors.accent },
  difficultyLabel:{ ...Typography.bodySmall, color: Colors.textSecondary, flex: 1 },
  timeLabel:      { ...Typography.bodySmall, color: Colors.textSecondary },
  fetchErrorNote: { ...Typography.caption, color: Colors.accent, opacity: 0.7, marginBottom: Spacing.sm },
  divider:        { height: 0.5, backgroundColor: Colors.accent, opacity: 0.4, marginBottom: Spacing.md },

  // ── Tabs ──────────────────────────────────────────────────────────
  tabRow:        { flexDirection: 'row', gap: Spacing.xl, paddingBottom: Spacing.sm },
  tabItem:       { alignItems: 'center', paddingBottom: Spacing.xs },
  tabLabel:      { ...Typography.body, color: Colors.textSecondary },
  tabLabelActive:{ color: Colors.textPrimary, fontWeight: '500' },
  tabUnderline:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 1.5, backgroundColor: Colors.accent, borderRadius: Radius.full },

  // ── Tab content ───────────────────────────────────────────────────
  tabContent:            { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  ingredientHeader:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  ingredientHeaderLabel: { ...Typography.label, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  ingredientRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  ingredientAvatar:      { width: 36, height: 36, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.accent, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceRaised },
  ingredientAvatarText:  { ...Typography.bodySmall, color: Colors.accent, fontWeight: '500' },
  ingredientName:        { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  ingredientMeasure:     { ...Typography.bodySmall, color: Colors.textSecondary },
  stepRow:               { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  stepNumber:            { width: 28, height: 28, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.accent, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumberText:        { ...Typography.label, color: Colors.accent, fontWeight: '500' },
  stepText:              { ...Typography.body, color: Colors.textPrimary, flex: 1, lineHeight: 22 },
  emptyNote:             { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.xl },

  // ── FAB ───────────────────────────────────────────────────────────
  fab: {
    position: 'absolute', bottom: 90, right: Spacing.lg,
    width: 52, height: 52, borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabIcon: { color: Colors.background, fontSize: 24, fontWeight: '300', lineHeight: 28 },

  // ── CTA ───────────────────────────────────────────────────────────
  ctaWrapper: { position: 'absolute', bottom: Spacing.lg, left: Spacing.lg, right: Spacing.lg },
  ctaButton:  { backgroundColor: Colors.accent, paddingVertical: 16, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  ctaLabel:   { ...Typography.body, color: Colors.background, fontWeight: '600', letterSpacing: 0.5 },

  // ── SCRUM-209: Scan My Cabinet button (mirrors CocktailDetailScreen.scanButton) ──
  scanButtonWrap: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  scanButton: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: Colors.accentGlow,
    alignItems: 'center',
  },
  scanButtonText: {
    ...Typography.button,
    color: Colors.accent,
  },

  // ── SCRUM-209: Scan result modal (mirrors CocktailDetailScreen.modal*) ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accentDim,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: { ...Typography.heading, fontSize: 24 },
  modalClose: { ...Typography.body, color: Colors.textSecondary, fontSize: 18 },
  modalCenter: { paddingVertical: Spacing.xl, alignItems: 'center' },
  modalHint: { ...Typography.bodySmall, marginTop: Spacing.md },
  modalErrorText: {
    ...Typography.body,
    color: Colors.error,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  modalRetry: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  modalRetryText: { ...Typography.button, color: Colors.accent },
  modalSummary: {
    ...Typography.body,
    marginBottom: Spacing.md,
    color: Colors.textPrimary,
  },
  modalSummaryAccent: { color: Colors.accent, fontFamily: 'DMSans_500Medium' },
  modalSectionLabel: {
    ...Typography.label,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCheck: { ...Typography.body, color: Colors.success, width: 24, fontSize: 16 },
  modalCross: { ...Typography.body, color: Colors.error, width: 24, fontSize: 16 },
  modalRowText: { ...Typography.body, flex: 1 },
  modalCabinetCta: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  modalCabinetCtaText: { ...Typography.body, color: Colors.accent },
});
