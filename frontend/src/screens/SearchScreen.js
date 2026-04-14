// SCRUM-130: Search Screen — live debounced search + ingredient filter chips
// Wired to backend proxy GET /api/cocktails/search and /api/cocktails/filter
// Results rendered with CocktailCard; tapping navigates to CocktailDetailScreen

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, FlatList, ActivityIndicator,
} from 'react-native';
import CocktailCard from '../components/CocktailCard';
import { searchCocktails, filterByIngredient } from '../services/cocktailService';

const INGREDIENTS = [
  'Vodka', 'Gin', 'Rum', 'Tequila', 'Whiskey', 'Bourbon',
  'Lime', 'Lemon', 'Orange', 'Mint', 'Sugar', 'Bitters',
];

const DEBOUNCE_MS = 400;

export default function SearchScreen({ navigation }) {
  const [query, setQuery]                   = useState('');
  const [activeIngredient, setActiveIngredient] = useState(null);
  const [results, setResults]               = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);
  const [searched, setSearched]             = useState(false);
  const debounceTimer                       = useRef(null);

  // ── Debounced text search ──────────────────────────────────────────────────
  const runSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await searchCocktails(q);
      setResults(data);
      setSearched(true);
    } catch (err) {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeIngredient) return; // ingredient mode — don't also text-search
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
    } catch (err) {
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
    navigation.navigate('CocktailDetail', { id: item.idDrink, name: item.strDrink });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search</Text>

      {/* Search Input */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search cocktails..."
        placeholderTextColor="#4A4A4A"
        value={query}
        onChangeText={(t) => { setActiveIngredient(null); setQuery(t); }}
        returnKeyType="search"
      />

      {/* Active filter indicator */}
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

      {/* Ingredient Chips */}
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

      {/* Loading */}
      {loading && <ActivityIndicator color="#C9A84C" style={{ marginTop: 24 }} />}

      {/* Error */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Results */}
      {!loading && searched && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.idDrink}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>
              {results.length > 0 ? `${results.length} Results` : 'No results found'}
            </Text>
          }
          renderItem={({ item }) => (
            <CocktailCard
              drinkName={item.strDrink}
              imageUri={item.strDrinkThumb || null}
              tags={[item.strCategory, item.strAlcoholic].filter(Boolean)}
              onPress={() => handleCardPress(item)}
              style={styles.card}
            />
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0A0A0A', padding: 20 },
  title:        { fontSize: 28, fontWeight: 'bold', color: '#F5F0E8', marginTop: 40, marginBottom: 16 },
  searchInput:  {
    backgroundColor: '#1C1C1C', color: '#F5F0E8', padding: 14,
    borderRadius: 10, fontSize: 16, marginBottom: 12,
  },
  activeRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  activeLabel:  { color: '#8A8A8A', fontSize: 13 },
  clearText:    { color: '#C9A84C', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#F5F0E8', marginBottom: 10 },
  chipGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip:         {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#141414',
  },
  chipActive:   { borderColor: '#C9A84C', backgroundColor: '#C9A84C22' },
  chipText:     { color: '#8A8A8A', fontSize: 13 },
  chipTextActive: { color: '#C9A84C' },
  row:          { justifyContent: 'space-between', marginBottom: 16 },
  card:         { width: '48%' },
  errorText:    { color: '#FF6B6B', fontSize: 13, textAlign: 'center', marginTop: 12 },
});
