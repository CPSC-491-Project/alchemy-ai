// SCRUM-130 + SCRUM-172: Cocktail Detail Screen
// Displays full cocktail record fetched via GET /api/recipes/:id
// Consumes the normalized drink shape: { id, name, thumb, category, alcoholic,
//   glass, instructions, ingredients }
//
// FIX (Ngoc Tran — SCRUM-198):
// Added useFonts — CormorantGaramond_300Light + DMSans_400Regular + DMSans_500Medium.
// Missing this causes a silent blank-screen crash on Expo web.
// Font guard (return null) placed after all hooks, before JSX.
//
// FEATURE (Ngoc Tran — SCRUM-205):
// "Scan My Cabinet" button + result modal. Compares the drink's required
// ingredients against the user's cabinet using compareCabinetToDrink from
// SCRUM-204. Renders matched / missing lists and a coverage summary.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useFonts, CormorantGaramond_300Light } from '@expo-google-fonts/cormorant-garamond';
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { getCocktailById } from '../services/cocktailService';
import { getCabinet, addIngredient } from '../services/cabinetService';
import { compareCabinetToDrink } from '../utils/cabinetCoverage';
import { useAuth } from '../context/AuthContext';

export default function CocktailDetailScreen({ route, navigation }) {
  // FIX: useFonts — declared FIRST before any other hooks.
  // Screens using Cormorant/DMSans without this call render a blank screen
  // on Expo web. The font guard (return null) is placed after all hooks.
  const [fontsLoaded] = useFonts({
    CormorantGaramond_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  const { id } = route.params;
  const [cocktail, setCocktail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // SCRUM-205: Cabinet scan state. Hooks declared up top, before any early
  // returns, to keep React's rules-of-hooks ordering stable.
  const { isGuest } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { matched, missing, matchedCount, ingredientCount, matchPercentage }
  const [scanError, setScanError] = useState(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [addingAll, setAddingAll] = useState(false);

  useEffect(() => {
    getCocktailById(id)
      .then(setCocktail)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // SCRUM-205: Run a cabinet scan against the loaded drink.
  // - For guests, this never runs — the button navigates to Login instead.
  // - getCabinet() returns [] for any failure (auth, network, missing config),
  //   which we treat as a valid "empty cabinet" outcome rather than an error.
  // - The compare function is pure and synchronous; only the cabinet fetch
  //   is async, so the loading window is short.
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
      // getCabinet() shouldn't throw, but guard anyway so the modal never
      // gets stuck in a perpetual loading state.
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

  // SCRUM-221: Persist all ingredients to /api/cabinet via addIngredient().
  // Uses Promise.allSettled so a single failure doesn't abort the batch.
  async function handleAddAllToCabinet() {
    if (!cocktail) return;
    if (isGuest) {
      Alert.alert('Sign in required', 'Sign in to save ingredients to your cabinet');
      return;
    }
    const ingredients = (cocktail.ingredients || []).filter((i) => i.name);
    if (ingredients.length === 0) return;
    setAddingAll(true);
    try {
      const results = await Promise.allSettled(
        ingredients.map((ing) =>
          addIngredient({ name: ing.name, category: 'spirit', quantity: ing.measure || '' })
        )
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed    = results.filter((r) => r.status === 'rejected').length;
      if (failed === 0) {
        Alert.alert('Added!', `${succeeded} ingredient${succeeded !== 1 ? 's' : ''} added to your cabinet!`);
      } else if (succeeded > 0) {
        Alert.alert('Partial Success', `${succeeded} added, ${failed} could not be saved. Try again.`);
      } else {
        Alert.alert('Error', 'Could not add ingredients. Please check your connection.');
      }
    } finally {
      setAddingAll(false);
    }
  }

  // FIX: Font guard — must be AFTER all hooks, BEFORE any JSX return
  if (!fontsLoaded) return null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (error || !cocktail) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Cocktail not found.'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── Hero Image ── */}
      {cocktail.thumb ? (
        <Image
          source={{ uri: cocktail.thumb }}
          style={styles.hero}
          onError={() => {}} // suppress network errors silently
        />
      ) : (
        <View style={[styles.hero, styles.heroFallback]}>
          <Text style={styles.heroIcon}>⚗</Text>
        </View>
      )}

      {/* ── Back Button ── */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backOverlay}>
        <Text style={styles.backOverlayText}>←</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        {/* ── Name ── */}
        <Text style={styles.title}>{cocktail.name}</Text>

        {/* ── Badges ── */}
        <View style={styles.badgeRow}>
          {cocktail.category && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cocktail.category}</Text>
            </View>
          )}
          {cocktail.alcoholic && (
            <View style={[styles.badge, styles.badgeGold]}>
              <Text style={[styles.badgeText, styles.badgeTextGold]}>
                {cocktail.alcoholic}
              </Text>
            </View>
          )}
          {cocktail.glass && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cocktail.glass}</Text>
            </View>
          )}
        </View>

        {/* ── Ingredients ── */}
        <Text style={styles.sectionTitle}>Ingredients</Text>
        <View style={styles.ingredientList}>
          {(cocktail.ingredients || []).map((ing, idx) => (
            <View key={idx} style={styles.ingredientRow}>
              <Text style={styles.ingredientName}>{ing.name}</Text>
              {ing.measure ? (
                <Text style={styles.ingredientMeasure}>{ing.measure}</Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* ── Instructions ── */}
        {cocktail.instructions && (
          <>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Text style={styles.instructions}>{cocktail.instructions}</Text>
          </>
        )}

        {/* ── SCRUM-221: Add All to Cabinet ── */}
        <TouchableOpacity
          style={[styles.ctaButton, { opacity: addingAll ? 0.7 : 1 }]}
          onPress={handleAddAllToCabinet}
          disabled={addingAll}
          accessibilityRole="button"
          accessibilityLabel="Add all ingredients to cabinet"
          activeOpacity={0.85}
        >
          {addingAll ? (
            <ActivityIndicator color="#C9A84C" />
          ) : (
            <Text style={styles.ctaLabel}>Add All to Cabinet</Text>
          )}
        </TouchableOpacity>

        {/* ── SCRUM-205: Scan My Cabinet ── */}
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

        <View style={styles.bottomSpacer} />
      </View>

      {/* ── SCRUM-205: Scan Result Modal ── */}
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
                {/* ── Summary line ── */}
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

                {/* ── Have list ── */}
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

                {/* ── Missing list ── */}
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

                {/* ── Empty cabinet hint ── */}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  center:           { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  hero:             { width: '100%', height: 300 },
  heroFallback:     { backgroundColor: Colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  heroIcon:         { fontSize: 64, opacity: 0.3 },
  backOverlay:      {
    position: 'absolute', top: 48, left: Spacing.md,
    backgroundColor: Colors.accentDim, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  backOverlayText:  { ...Typography.body, color: Colors.textPrimary, fontSize: 18 },
  content:          { padding: Spacing.md },
  title:            { ...Typography.heading, fontSize: 28, marginBottom: Spacing.sm },
  badgeRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
  badge:            {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceRaised,
  },
  badgeGold:        { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  badgeText:        { ...Typography.bodySmall },
  badgeTextGold:    { color: Colors.accent },
  sectionTitle:     { ...Typography.label, marginBottom: Spacing.sm },
  ingredientList:   {
    backgroundColor: Colors.surfaceRaised, borderRadius: Radius.md,
    marginBottom: Spacing.lg, overflow: 'hidden',
  },
  ingredientRow:    {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  ingredientName:   { ...Typography.body },
  ingredientMeasure:{ ...Typography.body, color: Colors.accent },
  instructions:     { ...Typography.body, color: Colors.textSecondary, lineHeight: 24 },
  errorText:        { ...Typography.body, color: Colors.error, marginBottom: Spacing.md },
  backBtn:          { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  backBtnText:      { ...Typography.body, color: Colors.accent },
  bottomSpacer:     { height: Spacing.xl },

  // ── SCRUM-205: Scan My Cabinet button ──────────────────────────────────────
  scanButton:       {
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
    paddingVertical: 14, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.accent,
    backgroundColor: Colors.accentGlow,
    alignItems: 'center',
  },
  scanButtonText:   {
    ...Typography.button,
    color: Colors.accent,
  },

  // ── SCRUM-209: Add All to Cabinet button (mirrors RecipeDetailScreen.ctaButton) ──
  ctaButton:        {
    marginTop: Spacing.lg,
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel:         {
    ...Typography.body,
    color: Colors.background,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ── SCRUM-205: Scan result modal ───────────────────────────────────────────
  modalBackdrop:    {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center',
    padding: Spacing.md,
  },
  modalCard:        {
    width: '100%', maxWidth: 480, maxHeight: '80%',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.accentDim,
    padding: Spacing.lg,
  },
  modalHeader:      {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle:       { ...Typography.heading, fontSize: 24 },
  modalClose:       { ...Typography.body, color: Colors.textSecondary, fontSize: 18 },
  modalCenter:      { paddingVertical: Spacing.xl, alignItems: 'center' },
  modalHint:        { ...Typography.bodySmall, marginTop: Spacing.md },
  modalErrorText:   { ...Typography.body, color: Colors.error, marginBottom: Spacing.md, textAlign: 'center' },
  modalRetry:       {
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.accent,
  },
  modalRetryText:   { ...Typography.button, color: Colors.accent },
  modalSummary:     {
    ...Typography.body, marginBottom: Spacing.md,
    color: Colors.textPrimary,
  },
  modalSummaryAccent:{ color: Colors.accent, fontFamily: 'DMSans_500Medium' },
  modalSectionLabel:{
    ...Typography.label,
    marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  modalRow:         {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalCheck:       { ...Typography.body, color: Colors.success, width: 24, fontSize: 16 },
  modalCross:       { ...Typography.body, color: Colors.error,   width: 24, fontSize: 16 },
  modalRowText:     { ...Typography.body, flex: 1 },
  modalCabinetCta:  {
    marginTop: Spacing.lg, paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  modalCabinetCtaText: { ...Typography.body, color: Colors.accent },
});
