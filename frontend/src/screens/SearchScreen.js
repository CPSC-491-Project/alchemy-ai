// src/screens/SearchScreen.js
// Alchemy AI — Search Screen
// Sprint 1: UI skeleton with search bar. Sprint 3 will wire to CocktailDB / backend API.

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Animated,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';

// Placeholder ingredient chips for Sprint 1 UI demo
const SUGGESTED_INGREDIENTS = [
  'Vodka', 'Gin', 'Rum', 'Tequila', 'Whiskey',
  'Lime juice', 'Lemon juice', 'Simple syrup',
  'Campari', 'Vermouth', 'Triple sec', 'Aperol',
];

// Placeholder result cards — replace with API results in Sprint 3
const PLACEHOLDER_RESULTS = [
  { id: '1', name: 'Classic Martini',   match: '98%', ingredients: 'Gin, Dry Vermouth, Lemon twist' },
  { id: '2', name: 'Tom Collins',       match: '91%', ingredients: 'Gin, Lemon juice, Simple syrup, Soda' },
  { id: '3', name: 'Gimlet',            match: '87%', ingredients: 'Gin, Lime juice, Simple syrup' },
];

export default function SearchScreen() {
  const [query, setQuery]               = useState('');
  const [activeIngredients, setActive]  = useState([]);
  const [showResults, setShowResults]   = useState(false);
  const [focused, setFocused]           = useState(false);

  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const inputRef   = useRef(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 600, useNativeDriver: true,
    }).start();
  }, []);

  const toggleIngredient = (item) => {
    setActive((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSearch = () => {
    Keyboard.dismiss();
    if (query.trim().length > 0 || activeIngredients.length > 0) {
      // TODO Sprint 3: call recommendation API with query + activeIngredients
      // e.g., dispatch(fetchRecommendations({ ingredients: activeIngredients, query }))
      setShowResults(true);
    }
  };

  const clearAll = () => {
    setQuery('');
    setActive([]);
    setShowResults(false);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Find a cocktail</Text>
          <Text style={styles.headerSub}>Search by ingredient or name</Text>
        </View>

        {/* ── Search Bar ── */}
        <View style={[styles.searchBar, focused && styles.searchBarFocused]}>
          <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="e.g. gin, lemon, elderflower..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Active ingredient tags ── */}
        {activeIngredients.length > 0 && (
          <View style={styles.activeRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
              {activeIngredients.map((ing) => (
                <TouchableOpacity
                  key={ing}
                  style={styles.activeTag}
                  onPress={() => toggleIngredient(ing)}
                >
                  <Text style={styles.activeTagText}>{ing}</Text>
                  <Ionicons name="close" size={12} color={Colors.accent} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Search Button ── */}
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="options-outline" size={18} color={Colors.background} />
          <Text style={styles.searchButtonText}>Find cocktails</Text>
        </TouchableOpacity>

        {/* ── Ingredient Quick-Select ── */}
        {!showResults && (
          <>
            <Text style={styles.sectionLabel}>Common ingredients</Text>
            <View style={styles.chipGrid}>
              {SUGGESTED_INGREDIENTS.map((item) => {
                const active = activeIngredients.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleIngredient(item)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.sprintNote}>
              ⚗ Sprint 1 skeleton — search will connect to CocktailDB + AI engine in Sprint 3
            </Text>
          </>
        )}

        {/* ── Placeholder Results ── */}
        {showResults && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Text style={styles.sectionLabel}>
                {activeIngredients.length > 0
                  ? `Matches for ${activeIngredients.slice(0, 2).join(', ')}${activeIngredients.length > 2 ? '...' : ''}`
                  : `Results for "${query}"`}
              </Text>
              <TouchableOpacity onPress={clearAll}>
                <Text style={styles.clearText}>New search</Text>
              </TouchableOpacity>
            </View>

            {PLACEHOLDER_RESULTS.map((result) => (
              <TouchableOpacity key={result.id} style={styles.resultCard}>
                <View style={styles.resultLeft}>
                  <Text style={styles.resultName}>{result.name}</Text>
                  <Text style={styles.resultIngredients}>{result.ingredients}</Text>
                </View>
                <View style={styles.matchBadge}>
                  <Text style={styles.matchText}>{result.match}</Text>
                  <Text style={styles.matchLabel}>match</Text>
                </View>
              </TouchableOpacity>
            ))}

            <Text style={styles.sprintNote}>
              ⚗ Showing placeholder results — real data wired in Sprint 3
            </Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll:    { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  // Header
  header: { marginBottom: Spacing.lg, marginTop: Spacing.sm },
  headerTitle: { ...Typography.heading },
  headerSub:   { ...Typography.subheading, marginTop: 4 },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchBarFocused: {
    borderColor: Colors.accent,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    padding: 0,
  },

  // Active tags
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  tagRow: { gap: Spacing.sm, paddingRight: Spacing.sm },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accentDim,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  activeTagText: { ...Typography.bodySmall, color: Colors.accent },

  clearBtn: { paddingHorizontal: Spacing.sm },
  clearText: { ...Typography.bodySmall, color: Colors.accent },

  // Search button
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: 14,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  searchButtonText: { ...Typography.button, color: Colors.background, fontSize: 15 },

  // Section label
  sectionLabel: { ...Typography.label, marginBottom: Spacing.md },

  // Chip grid
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentDim,
  },
  chipText:       { ...Typography.bodySmall, color: Colors.textSecondary },
  chipTextActive: { color: Colors.accent },

  // Results
  resultsSection: { gap: Spacing.sm },
  resultsHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  resultCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  resultLeft:        { flex: 1, gap: 4 },
  resultName:        { ...Typography.body, fontFamily: 'DMSans_500Medium' },
  resultIngredients: { ...Typography.bodySmall },
  matchBadge: {
    alignItems: 'center',
    paddingLeft: Spacing.md,
  },
  matchText:  { ...Typography.body, color: Colors.accent, fontFamily: 'DMSans_500Medium' },
  matchLabel: { ...Typography.bodySmall, fontSize: 10 },

  // Sprint note
  sprintNote: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
});
