// Alchemy AI — Search Screen
// Features: search bar, filter chips, cocktail grid with live TheCocktailDB API + Firestore caching

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';

// Firebase is optional — if it fails (e.g. missing .env), we skip caching gracefully
let db = null;
let _doc = null;
let _getDoc = null;
let _setDoc = null;
try {
  const fbConfig = require('../../firebaseConfig');
  const firestore = require('firebase/firestore');
  db = fbConfig.db;
  _doc = firestore.doc;
  _getDoc = firestore.getDoc;
  _setDoc = firestore.setDoc;
} catch (e) {
  console.warn('Firebase unavailable, skipping Firestore cache:', e.message);
}

const FILTERS = ['All', 'Whiskey', 'Gin', 'Vodka', 'Rum', 'Tequila'];
const COCKTAILDB_URL = 'https://www.thecocktaildb.com/api/json/v1/1';
const DEFAULT_QUERIES = ['margarita', 'negroni', 'mojito', 'old fashioned'];

function normalizeDrink(drink) {
  const tags = [drink.strCategory, drink.strAlcoholic].filter(Boolean).slice(0, 2);
  return {
    id: drink.idDrink,
    name: drink.strDrink,
    image: drink.strDrinkThumb,
    tags,
    category: drink.strCategory || '',
    alcoholic: drink.strAlcoholic || '',
  };
}

async function fetchCocktails(searchQuery) {
  const cacheKey = searchQuery.toLowerCase().trim();

  // 1. Try Firestore cache first (only if Firebase is available)
  if (db && _doc && _getDoc) {
    try {
      const cached = await _getDoc(_doc(db, 'cocktailCache', cacheKey));
      if (cached.exists()) return cached.data().drinks;
    } catch (_) {}
  }

  // 2. Fetch from TheCocktailDB
  const res = await fetch(`${COCKTAILDB_URL}/search.php?s=${encodeURIComponent(cacheKey)}`);
  const data = await res.json();
  const drinks = (data.drinks || []).map(normalizeDrink);

  // 3. Save to Firestore cache (fire-and-forget, only if Firebase is available)
  if (drinks.length > 0 && db && _doc && _setDoc) {
    _setDoc(_doc(db, 'cocktailCache', cacheKey), { drinks, cachedAt: Date.now() }).catch(() => {});
  }

  return drinks;
}

function applyFilter(drinks, filter) {
  if (filter === 'All') return drinks;
  return drinks.filter(
    (d) =>
      d.category?.toLowerCase().includes(filter.toLowerCase()) ||
      d.name?.toLowerCase().includes(filter.toLowerCase()) ||
      d.tags?.some((t) => t?.toLowerCase().includes(filter.toLowerCase()))
  );
}

function StarRating() {
  return (
    <View style={styles.stars}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={styles.starFilled}>★</Text>
      ))}
    </View>
  );
}

function CocktailCard({ item }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.cardImage} />
      ) : (
        <View style={styles.cardImagePlaceholder} />
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <StarRating />
        <Text style={styles.cardTags} numberOfLines={1}>{item.tags.join(' · ')}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const [query, setQuery]         = useState('');
  const [activeFilter, setFilter] = useState('All');
  const [cocktails, setCocktails] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const debounceRef               = useRef(null);

  useEffect(() => { loadDefaults(); }, []);

  async function loadDefaults() {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(DEFAULT_QUERIES.map(fetchCocktails));
      const merged = results.flat();
      const unique = [...new Map(merged.map((d) => [d.id, d])).values()];
      setCocktails(unique);
    } catch (e) {
      setError('Could not load cocktails. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  function handleQueryChange(text) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim()) {
      loadDefaults();
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await fetchCocktails(text);
        setCocktails(results);
        if (results.length === 0) setError(`No cocktails found for "${text}"`);
      } catch (e) {
        setError('Search failed. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 500);
  }

  const displayedCocktails = applyFilter(cocktails, activeFilter);

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
          onChangeText={handleQueryChange}
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color="#C9A84C" style={{ marginLeft: 8 }} />}
        {query.length > 0 && !loading && (
          <TouchableOpacity onPress={() => handleQueryChange('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
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
            <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Loading state */}
      {loading && cocktails.length === 0 && (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#C9A84C" />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>Loading cocktails...</Text>
        </View>
      )}

      {/* Error / Empty State */}
      {error && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      )}

      {/* Cocktail Grid */}
      {!error && cocktails.length > 0 && (
        <FlatList
          data={displayedCocktails}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => <CocktailCard item={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        {['Home', 'Create', 'Favorites', 'Search', 'Profile'].map((tab) => (
          <TouchableOpacity key={tab} style={styles.navItem}>
            <Text style={[styles.navLabel, tab === 'Search' && styles.navLabelActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
  },
  backBtn: { width: 32 },
  backArrow: { color: '#F5F0E8', fontSize: 20 },
  headerTitle: { color: '#F5F0E8', fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
  headerIcon: { color: '#F5F0E8', fontSize: 18, width: 32, textAlign: 'right' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414',
    borderRadius: 24, marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: '#2A2A2A', marginBottom: 14,
  },
  searchDot: { color: '#C9A84C', fontSize: 10, marginRight: 10 },
  searchInput: { flex: 1, color: '#F5F0E8', fontSize: 14 },
  clearBtn: { color: '#4A4A4A', fontSize: 14, paddingLeft: 8 },

  filtersRow: { maxHeight: 44, marginBottom: 16 },
  filtersContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#141414',
  },
  chipActive: { borderColor: '#C9A84C', backgroundColor: '#C9A84C22' },
  chipText: { color: '#6A6A6A', fontSize: 13 },
  chipTextActive: { color: '#C9A84C', fontWeight: '500' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#4A4A4A', fontSize: 14, textAlign: 'center' },

  grid: { paddingHorizontal: 12, paddingBottom: 80 },
  gridRow: { justifyContent: 'space-between', marginBottom: 12 },
  card: {
    width: '48%', backgroundColor: '#141414', borderRadius: 14,
    borderWidth: 1, borderColor: '#2A2A2A', overflow: 'hidden',
  },
  cardImage: { width: '100%', height: 130, backgroundColor: '#1C1C1C' },
  cardImagePlaceholder: { width: '100%', height: 130, backgroundColor: '#1C1C1C' },
  cardBody: { padding: 10 },
  cardName: { color: '#F5F0E8', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  stars: { flexDirection: 'row', marginBottom: 4 },
  starFilled: { color: '#C9A84C', fontSize: 11, marginRight: 1 },
  cardTags: { color: '#C9A84C', fontSize: 11 },

  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#0A0A0A', borderTopWidth: 1, borderTopColor: '#1C1C1C',
    paddingVertical: 12, paddingBottom: 20,
  },
  navItem: { alignItems: 'center' },
  navLabel: { color: '#4A4A4A', fontSize: 12 },
  navLabelActive: { color: '#C9A84C' },
});
