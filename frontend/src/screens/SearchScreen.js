// Alchemy AI — Search Screen
// SCRUM-130 + SCRUM-172: live debounced search + ingredient filter chips
// UI UPGRADE (Allisa): hi-fi wireframe — gold search bar, styled chips, cocktail cards
// All design tokens from src/theme/index.js
//
// SCRUM-197 FIX (Allisa Warren):
// Added useFonts — CormorantGaramond_300Light + DMSans_400Regular + DMSans_500Medium.
// The headerTitle style uses fontFamily: 'CormorantGaramond_300Light' directly.
// Without useFonts this caused a silent blank screen on web.
// Font guard added after all hooks (same pattern as CabinetScreen / ProfileScreen).

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

// FIX: useFonts — MUST be imported and called or Cormorant/DMSans silently
// fail on Expo web, producing a blank screen with no console error visible
// to the user.
import { useFonts, CormorantGaramond_300Light } from '@expo-google-fonts/cormorant-garamond';
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';

import { Colors, Typography, Spacing, Radius } from '../theme';
import CocktailCard from '../components/CocktailCard';
import { searchCocktails, filterByIngredient } from '../services/cocktailService';

const INGREDIENTS = [
  'Whiskey', 'Gin', 'Citrus', 'Vermouth', 'Mezcal',
  'Rum', 'Tequila', 'Bourbon', 'Vodka', 'Bitters', 'Lime', 'Mint',
];

const DEBOUNCE_MS = 400;

export default function SearchScreen({ navigation }) {
  // FIX: useFonts — declared FIRST before any other hooks.
  // Font guard (return null) is placed after all hooks below.
  const [fontsLoaded] = useFonts({
    CormorantGaramond_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  const [query, setQuery]                   = useState('');
  const [activeIngredient, setActiveIngredient] = useState(null);
  const [results, setResults]               = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);
  const [searched, setSearched]             = useState(false);
  const debounceTimer                       = useRef(null);
  const inputRef                            = useRef(null);

  // ── Debounced text search ───────────────────────────────────────────────
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
    } catch (_err) {
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

  // ── Ingredient chip filter ──────────────────────────────────────────────
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
    } catch (_err) {
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

  // ── Render helpers ──────────────────────────────────────────────────────
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

  // FIX: Font guard — must be AFTER all hooks, BEFORE any JSX return
  if (!fontsLoaded) return null;

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
            onChangeText={(t) => {
              setActiveIngredient(null);
              setQuery(t);
            }}
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
              key={item}
              style={[styles.chip, activeIngredient === item && styles.chipActive]}
              onPress={() => handleIngredientTap(item)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${item}`}
              accessibilityState={{ selected: activeIngredient === item }}
            >
              <Text
                style={[
                  styles.chipText,
                  activeIngredient === item && styles.chipTextActive,
                ]}
              >
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
            Filtering by:{' '}
            <Text style={{ color: Colors.accent }}>{activeIngredient}</Text>
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

      {/* ── Results ── */}
      {!loading && searched && (
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

      {/* ── Idle state — show placeholder cards ── */}
      {!loading && !searched && (
        <View style={styles.idleGrid}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.idleCard} />
          ))}
        </View>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 22,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },

  // Search bar
  searchRow: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchBar: {
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
  searchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    opacity: 0.8,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
  },

  // Ingredient chips
  chipsWrapper: { marginBottom: Spacing.sm },
  chipsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Colors.surface,
    marginRight: Spacing.xs,
  },
  chipActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSubtle,
  },
  chipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  chipTextActive: { color: Colors.accent },

  // Active banner
  activeBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  activeBannerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  // Results
  resultsCount: {
    ...Typography.sectionHeader,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  card: { width: '48%' },
  listContent: { paddingBottom: Spacing.xxl },
  loader:    { marginTop: Spacing.lg },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },

  // Empty state
  emptyBlock: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.cardTitle,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    ...Typography.caption,
    color: Colors.textFaint,
  },

  // Idle placeholder grid (matches wireframe dark cards)
  idleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  idleCard: {
    width: '47.5%',
    height: 160,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
