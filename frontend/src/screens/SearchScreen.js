// Alchemy AI — Search Screen
// Features: search bar, filter chips, cocktail grid with ratings and tags

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  FlatList,
} from 'react-native';

const FILTERS = ['Whiskey', 'Gin', 'Citrus', 'Vermouth', 'Mezcal'];

const COCKTAILS = [
  { id: '1', name: 'Old Fashioned', rating: 5, tags: ['Classic', 'Stirred'] },
  { id: '2', name: 'Negroni',       rating: 5, tags: ['Bitter', 'Stirred'] },
  { id: '3', name: 'Manhattan',     rating: 5, tags: ['Rich', 'Stirred'] },
  { id: '4', name: 'Margarita',     rating: 5, tags: ['Citrus', 'Shaken'] },
];

function StarRating({ count = 5 }) {
  return (
    <View style={styles.stars}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={[styles.star, i < count && styles.starFilled]}>★</Text>
      ))}
    </View>
  );
}

function CocktailCard({ item }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8}>
      {/* Image placeholder */}
      <View style={styles.cardImage} />
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{item.name}</Text>
        <StarRating count={item.rating} />
        <Text style={styles.cardTags}>{item.tags.join(' · ')}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const [query, setQuery]         = useState('');
  const [activeFilter, setFilter] = useState('Whiskey');

  return (
    <SafeAreaView style={styles.root}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
        <TouchableOpacity>
          <Text style={styles.headerIcon}>♪</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchDot}>●</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Find a cocktail or ingredient..."
          placeholderTextColor="#4A4A4A"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersRow}
        contentContainerStyle={styles.filtersContent}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, activeFilter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Cocktail Grid */}
      <FlatList
        data={COCKTAILS}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => <CocktailCard item={item} />}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        {['Home', 'Create', 'Favorites', 'Search', 'Profile'].map((tab) => (
          <TouchableOpacity key={tab} style={styles.navItem}>
            <Text style={[styles.navLabel, tab === 'Search' && styles.navLabelActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: { width: 32 },
  backArrow: { color: '#F5F0E8', fontSize: 20 },
  headerTitle: { color: '#F5F0E8', fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
  headerIcon: { color: '#F5F0E8', fontSize: 18, width: 32, textAlign: 'right' },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 24,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 14,
  },
  searchDot: { color: '#C9A84C', fontSize: 10, marginRight: 10 },
  searchInput: { flex: 1, color: '#F5F0E8', fontSize: 14 },

  // Filter Chips
  filtersRow: { maxHeight: 44, marginBottom: 16 },
  filtersContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#141414',
  },
  chipActive: { borderColor: '#C9A84C', backgroundColor: '#C9A84C22' },
  chipText: { color: '#6A6A6A', fontSize: 13 },
  chipTextActive: { color: '#C9A84C', fontWeight: '500' },

  // Grid
  grid: { paddingHorizontal: 12, paddingBottom: 80 },
  gridRow: { justifyContent: 'space-between', marginBottom: 12 },
  card: {
    width: '48%',
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 130,
    backgroundColor: '#1C1C1C',
  },
  cardBody: {
    padding: 10,
  },
  cardName: {
    color: '#F5F0E8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  stars: { flexDirection: 'row', marginBottom: 4 },
  star: { color: '#2A2A2A', fontSize: 11, marginRight: 1 },
  starFilled: { color: '#C9A84C' },
  cardTags: { color: '#C9A84C', fontSize: 11 },

  // Bottom Nav
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#1C1C1C',
    paddingVertical: 12,
    paddingBottom: 20,
  },
  navItem: { alignItems: 'center' },
  navLabel: { color: '#4A4A4A', fontSize: 12 },
  navLabelActive: { color: '#C9A84C' },
});
