// Alchemy AI — Search Screen
// SCRUM-63: Wired to backend cocktail search proxy

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000';

const INGREDIENTS = [
  'Vodka', 'Gin', 'Rum', 'Tequila', 'Whiskey', 'Bourbon',
  'Lime', 'Lemon', 'Orange', 'Mint', 'Sugar', 'Bitters',
];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [activeIngredients, setActiveIngredients] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleIngredient = (name) => {
    setActiveIngredients((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  };

  const handleSearch = async () => {
    if (!query && activeIngredients.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const searchTerm = query || activeIngredients.join(' ');
      const res = await fetch(
        `${BACKEND_URL}/api/cocktails/search?q=${encodeURIComponent(searchTerm)}`
      );
      const data = await res.json();
      setResults(data);
      setShowResults(true);
    } catch (err) {
      console.error('Search error:', err);
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setActiveIngredients([]);
    setShowResults(false);
    setResults([]);
    setError(null);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Search</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search cocktails..."
        placeholderTextColor="#4A4A4A"
        value={query}
        onChangeText={setQuery}
      />

      {activeIngredients.length > 0 && (
        <View style={styles.activeRow}>
          <Text style={styles.activeLabel}>Selected: {activeIngredients.join(', ')}</Text>
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>Ingredients</Text>
      <View style={styles.chipGrid}>
        {INGREDIENTS.map((name) => (
          <TouchableOpacity
            key={name}
            style={[styles.chip, activeIngredients.includes(name) && styles.chipActive]}
            onPress={() => toggleIngredient(name)}
          >
            <Text style={[styles.chipText, activeIngredients.includes(name) && styles.chipTextActive]}>
              {name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
        <Text style={styles.searchButtonText}>Find Cocktails</Text>
      </TouchableOpacity>

      {loading && (
        <ActivityIndicator color="#C9A84C" style={{ marginTop: 24 }} />
      )}

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {showResults && !loading && (
        <View style={styles.results}>
          <Text style={styles.sectionTitle}>
            {results.length > 0 ? `${results.length} Results` : 'No results found'}
          </Text>
          {results.map((r) => (
            <View key={r.idDrink} style={styles.resultCard}>
              <Text style={styles.resultName}>{r.strDrink}</Text>
              <Text style={styles.resultCategory}>{r.strCategory}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#F5F0E8', marginTop: 40, marginBottom: 20 },
  searchInput: {
    backgroundColor: '#1C1C1C', color: '#F5F0E8', padding: 14,
    borderRadius: 10, fontSize: 16, marginBottom: 16,
  },
  activeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  activeLabel: { color: '#8A8A8A', fontSize: 13 },
  clearText: { color: '#C9A84C', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#F5F0E8', marginBottom: 12 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#141414',
  },
  chipActive: { borderColor: '#C9A84C', backgroundColor: '#C9A84C22' },
  chipText: { color: '#8A8A8A', fontSize: 13 },
  chipTextActive: { color: '#C9A84C' },
  searchButton: {
    backgroundColor: '#C9A84C', paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', marginBottom: 24,
  },
  searchButtonText: { color: '#0A0A0A', fontSize: 16, fontWeight: '600' },
  results: { marginTop: 8 },
  resultCard: {
    backgroundColor: '#1C1C1C', padding: 16, borderRadius: 10,
    marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between',
  },
  resultName: { color: '#F5F0E8', fontSize: 16, fontWeight: '600' },
  resultCategory: { color: '#C9A84C', fontSize: 14 },
  errorText: { color: '#FF6B6B', fontSize: 13, textAlign: 'center', marginTop: 12 },
});
