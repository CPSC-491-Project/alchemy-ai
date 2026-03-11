// Alchemy AI — Search Screen
// Sprint 1: UI skeleton with search bar. Sprint 3 will wire to CocktailDB / backend API.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

// Placeholder ingredient chips for Sprint 1 UI demo
const INGREDIENTS = [
  'Vodka', 'Gin', 'Rum', 'Tequila', 'Whiskey', 'Bourbon',
  'Lime', 'Lemon', 'Orange', 'Mint', 'Sugar', 'Bitters',
];

// Placeholder result cards — replace with API results in Sprint 3
const PLACEHOLDER_RESULTS = [
  { id: '1', name: 'Moscow Mule', match: '95%' },
  { id: '2', name: 'Mojito', match: '88%' },
  { id: '3', name: 'Old Fashioned', match: '82%' },
];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [activeIngredients, setActiveIngredients] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const toggleIngredient = (name) => {
    setActiveIngredients((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  };

  const handleSearch = () => {
    // TODO Sprint 3: call recommendation API with query + activeIngredients
    setShowResults(true);
  };

  const handleClear = () => {
    setQuery('');
    setActiveIngredients([]);
    setShowResults(false);
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

      {showResults && (
        <View style={styles.results}>
          <Text style={styles.sectionTitle}>Results</Text>
          {PLACEHOLDER_RESULTS.map((r) => (
            <View key={r.id} style={styles.resultCard}>
              <Text style={styles.resultName}>{r.name}</Text>
              <Text style={styles.resultMatch}>{r.match}</Text>
            </View>
          ))}
          <Text style={styles.note}>Sprint 1 placeholder — real data wired in Sprint 3</Text>
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
  resultMatch: { color: '#C9A84C', fontSize: 14 },
  note: { color: '#4A4A4A', fontSize: 12, textAlign: 'center', marginTop: 12 },
});
