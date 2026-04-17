// SCRUM-130 + SCRUM-172: Search Screen — live debounced search + ingredient filter chips
// Wired to backend proxy GET /api/recipes/search and /api/recipes/filter
// Results rendered with CocktailCard; tapping navigates to CocktailDetailScreen
// All result items use the normalized drink shape: { id, name, thumb, category, alcoholic, ... }

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, FlatList, ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';
import CocktailCard from '../components/CocktailCard';
import { searchCocktails, filterByIngredient } from '../services/cocktailService';
import EmptyState from '../components/EmptyState';

const INGREDIENTS = [
  'Vodka', 'Gin', 'Rum', 'Tequila', 'Whiskey', 'Bourbon',
  'Lime', 'Lemon', 'Orange', 'Mint', 'Sugar', 'Bitters',
];

const DEBOUNCE_MS = 400;

export default function SearchScreen({ navigation }) {
  const [query, setQuery]                       = useState('');
  const [activeIngredient, setActiveIngredient] = useState(null);
  const [results, setResults]                   = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState(null);
  const [searched, setSearched]                 = useState(false);
  const debounceTimer                           = useRef(null);

  // ── Debounced text search ──────────────────────────────────────────────────
  const runSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
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

  // ── Ingredient chip filter ─────────────────────────────────────────────────
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
  };

  const handleCardPress = (item) => {
    // SCRUM-172: normalized shape — was item.idDrink / item.strDrink
    navigation.navigate('CocktailDetail', { id: item.id, name: item.name });
  };

  const renderCard = ({ item }) => (
    // SCRUM-172: normalized shape — was item.strDrink / item.strDrinkThumb /
    // item.strCategory / item.strAlcoholic (which only existed on the
    // un-normalized filter payload, causing live search cards to render empty).
    <CocktailCard
      drinkName={item.name}
      imageUri={item.thumb || null}
      tags={[item.category, item.alcoholic].filter(Boolean)}
      onPress={() => handleCardPress(item)}
      style={styles.card}
    />
  );

  const renderHeader = () => (
    <Text style={styles.sectionTitle}>
      {results.length > 0 ? `${results.length} Results` : 'No results found'}
    </Text>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search cocktails..."
        placeholderTextColor={Colors.textMuted}
        value={query}
        onChangeText={(t) => { setActiveIngredient(null); setQuery(t); }}
        returnKeyType="search"
      />

      {(activeIngredient || query) && (
        <View style={styles.activeRow}>
          <Text style={styles.activeLabel}>
            {activeIngredient ? `Filtered by: ${activeIngredient}` : `Searching: "${query}"`}
          </Text>
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>Filter by Ingredient</Text>
      <View style={styles.chipGrid}>
        {INGREDIENTS.map((name) => (
          <TouchableOpacity
            key={name}
            style={[styles.chip, activeIngredient === name && styles.chipActive]}
            onPress={() => handleIngredientTap(name)}
          >
            <Text style={[styles.chipText, activeIngredient === name && styles.chipTextActive]}>
              {name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <ActivityIndicator color={Colors.accent} style={styles.loader} />}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {!loading && searched && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listEmpty: { flex: 1,},
  container:    { flex: 1, backgroundColor: Colors.background, padding: Spacing.md },
  title:        { ...Typography.heading, fontSize: 28, marginTop: Spacing.xl, marginBottom: Spacing.md },
  searchInput:  {
    backgroundColor: Colors.surfaceRaised, color: Colors.textPrimary,
    padding: 14, borderRadius: Radius.md, fontSize: 16, marginBottom: 12,
  },
  activeRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  activeLabel:  { ...Typography.bodySmall },
  clearText:    { ...Typography.bodySmall, color: Colors.accent },
  sectionTitle: { ...Typography.label, marginBottom: Spacing.sm },
  chipGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  chip:         {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipActive:     { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  chipText:       { ...Typography.bodySmall },
  chipTextActive: { color: Colors.accent },
  loader:         { marginTop: Spacing.lg },
  row:            { justifyContent: 'space-between', marginBottom: Spacing.md },
  card:           { width: '48%' },
  errorText:      { ...Typography.bodySmall, color: Colors.error, textAlign: 'center', marginTop: 12 },
  listContent:    { paddingBottom: Spacing.xl },
});
