// Alchemy AI — Search Screen
// SCRUM-130 + SCRUM-172: live debounced search + ingredient filter chips
// UI: hi-fi wireframe — gold search bar, styled chips, cocktail cards
//
// FIX (Allisa Warren — SCRUM-198):
// Added useFonts — CormorantGaramond_300Light + DMSans (already present).
//
// FIX (Allisa Warren — SCRUM-199):
// Pre-load featured cocktails on mount so the grid is never empty when
// the user first opens Search. Loads 6 random cocktails in parallel via
// getRandomCocktail(). If the backend is unreachable the placeholder grid
// still shows (same dark boxes as before, but only as a fallback).
// The featured set is replaced the moment the user types or taps a chip.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, CormorantGaramond_300Light } from '@expo-google-fonts/cormorant-garamond';
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import { Colors, Typography, Spacing, Radius } from '../theme';
import CocktailCard from '../components/CocktailCard';
import { searchCocktails, filterByIngredient, getRandomCocktail } from '../services/cocktailService';

const INGREDIENTS = [
  'Whiskey', 'Gin', 'Citrus', 'Vermouth', 'Mezcal',
  'Rum', 'Tequila', 'Bourbon', 'Vodka', 'Bitters', 'Lime', 'Mint',
];
const DEBOUNCE_MS    = 400;
const FEATURED_COUNT = 6; // cocktails to pre-load on mount

export default function SearchScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  const [query,            setQuery]            = useState('');
  const [activeIngredient, setActiveIngredient] = useState(null);
  const [results,          setResults]          = useState([]);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState(null);
  const [searched,         setSearched]         = useState(false);

  // FIX: featured cocktails shown before any user interaction
  const [featured,        setFeatured]        = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  const debounceTimer = useRef(null);
  const inputRef      = useRef(null);

  // ── Pre-load featured cocktails on mount ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function loadFeatured() {
      try {
        const promises = Array.from({ length: FEATURED_COUNT }, () => getRandomCocktail());
        const drinks   = await Promise.all(promises);
        if (!cancelled) setFeatured(drinks);
      } catch {
        // Backend unreachable — featured stays empty, idle grid shows placeholders
      } finally {
        if (!cancelled) setLoadingFeatured(false);
      }
    }
    loadFeatured();
    return () => { cancelled = true; };
  }, []);

  // ── Debounced text search ─────────────────────────────────────────────────
  const runSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await searchCocktails(q);
      setResults(data);
      setSearched(true);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeIngredient) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => clearTimeout(debounceTimer.current);
  }, [query, activeIngredient, runSearch]);

  // ── Ingredient chip filter ────────────────────────────────────────────────
  const handleIngredientTap = async (name) => {
    if (activeIngredient === name) {
      setActiveIngredient(null);
      setResults([]);
      setSearched(false);
      return;
    }
    setActiveIngredient(name);
    setQuery('');
    setLoading(true);
    setError(null);
    try {
      const data = await filterByIngredient(name);
      setResults(data);
      setSearched(true);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setActiveIngredient(null);
    setResults([]);
    setSearched(false);
    setError(null);
    inputRef.current?.focus();
  };

  const handleCardPress = (item) => {
    navigation.navigate('CocktailDetail', { id: item.id, name: item.name });
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderCard = ({ item }) => (
    <CocktailCard
      drinkName={item.name}
      imageUri={item.thumb || null}
      tags={[item.category, item.alcoholic].filter(Boolean)}
      onPress={() => handleCardPress(item)}
      style={styles.card}
    />
  );

  const renderListHeader = () => (
    <Text style={styles.resultsCount}>
      {results.length} {results.length === 1 ? 'Result' : 'Results'}
    </Text>
  );

  const renderEmpty = () =>
    searched && !loading ? (
      <View style={styles.emptyBlock}>
        <Ionicons name="wine-outline" size={48} color={Colors.textFaint} />
        <Text style={styles.emptyText}>No cocktails found</Text>
        <Text style={styles.emptySubtext}>Try a different ingredient or name</Text>
      </View>
    ) : null;

  if (!fontsLoaded) return null;

  // Are we in "user has interacted" mode?
  const userIsSearching = searched || !!query || !!activeIngredient || loading;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation?.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={Colors.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <View style={styles.searchDot} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Find a cocktail or ingredient..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={(t) => { setActiveIngredient(null); setQuery(t); }}
            returnKeyType="search"
            accessibilityLabel="Search cocktails"
          />
          {(query.length > 0 || activeIngredient) && (
            <TouchableOpacity onPress={handleClear} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Ingredient chips ── */}
      <View style={styles.chipsWrapper}>
        <FlatList
          data={INGREDIENTS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.chipsContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, activeIngredient === item && styles.chipActive]}
              onPress={() => handleIngredientTap(item)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${item}`}
              accessibilityState={{ selected: activeIngredient === item }}
            >
              <Text style={[styles.chipText, activeIngredient === item && styles.chipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* ── Active filter banner ── */}
      {activeIngredient && (
        <View style={styles.activeBanner}>
          <Text style={styles.activeBannerText}>
            Filtering by: <Text style={{ color: Colors.accent }}>{activeIngredient}</Text>
          </Text>
        </View>
      )}

      {/* ── Loading ── */}
      {loading && (
        <ActivityIndicator color={Colors.accent} size="small" style={styles.loader} />
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* ── Results (user has searched / filtered) ── */}
      {!loading && userIsSearching && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={results.length > 0 ? renderListHeader : null}
          ListEmptyComponent={renderEmpty}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* ── Featured grid (idle — no user interaction yet) ── */}
      {!loading && !userIsSearching && (
        <>
          {loadingFeatured ? (
            // Still fetching featured — show the dark placeholder boxes
            <View style={styles.idleGrid}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.idleCard} />
              ))}
            </View>
          ) : featured.length > 0 ? (
            // Featured loaded — show real cards with a section label
            <>
              <Text style={styles.featuredLabel}>Featured Cocktails</Text>
              <FlatList
                data={featured}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.row}
                showsVerticalScrollIndicator={false}
                renderItem={renderCard}
                contentContainerStyle={styles.listContent}
              />
            </>
          ) : (
            // Backend unreachable — show placeholder boxes
            <View style={styles.idleGrid}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.idleCard} />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'ios' ? 50 : 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  backBtn:     { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 22,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  searchRow:   { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  searchBar:   {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: `${Colors.accent}40`,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  searchDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent, opacity: 0.8 },
  searchInput: { flex: 1, ...Typography.body, color: Colors.textPrimary, fontSize: 14, paddingVertical: 0 },
  chipsWrapper:  { marginBottom: Spacing.sm },
  chipsContent:  { paddingHorizontal: Spacing.lg, gap: Spacing.xs },
  chip:          {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Colors.surface,
    marginRight: Spacing.xs,
  },
  chipActive:    { borderColor: Colors.accent, backgroundColor: Colors.accentSubtle },
  chipText:      { ...Typography.caption, color: Colors.textSecondary },
  chipTextActive:{ color: Colors.accent },
  activeBanner:      { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  activeBannerText:  { ...Typography.caption, color: Colors.textSecondary },
  resultsCount:  { ...Typography.sectionHeader, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, paddingTop: Spacing.xs },
  // FIX: label above featured grid
  featuredLabel: {
    ...Typography.sectionHeader,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.xs,
    color: Colors.textSecondary,
  },
  row:           { justifyContent: 'space-between', paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  card:          { width: '48%' },
  listContent:   { paddingBottom: Spacing.xxl },
  loader:        { marginTop: Spacing.lg },
  errorText:     { ...Typography.bodySmall, color: Colors.error, textAlign: 'center', marginTop: Spacing.md, paddingHorizontal: Spacing.lg },
  emptyBlock:    { alignItems: 'center', marginTop: Spacing.xxl, gap: Spacing.sm },
  emptyText:     { ...Typography.cardTitle, color: Colors.textSecondary },
  emptySubtext:  { ...Typography.caption, color: Colors.textFaint },
  // Placeholder grid (fallback when backend unreachable)
  idleGrid:      { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginTop: Spacing.sm },
  idleCard:      { width: '47.5%', height: 160, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
});
