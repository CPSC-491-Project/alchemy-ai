// Alchemy AI — Cocktail Detail Screen
// Fetches full cocktail info from our backend which proxies TheCocktailDB

import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';

// ⚠️ Change this to your actual backend URL when deployed
// For local dev with Expo Go on your phone, use your computer's LAN IP e.g. http://192.168.1.x:5000
// For web browser testing: http://localhost:5000
const BACKEND_URL = 'http://localhost:5000';

export default function CocktailDetailScreen({ route, navigation }) {
  const { cocktailId, cocktailName } = route.params;
  const [cocktail, setCocktail] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    fetchDetail();
  }, [cocktailId]);

  async function fetchDetail() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/cocktails/${cocktailId}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setCocktail(data);
    } catch (e) {
      console.error('Detail fetch error:', e);
      setError('Could not load cocktail details. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A84C" />
          <Text style={styles.loadingText}>Loading {cocktailName}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.root}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchDetail}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {cocktail.image ? (
            <Image source={{ uri: cocktail.image }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder} />
          )}
          {/* Back button overlaid on image */}
          <TouchableOpacity style={styles.backOverlay} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          {/* Gradient overlay for readability */}
          <View style={styles.heroGradient} />
          <View style={styles.heroMeta}>
            <Text style={styles.heroName}>{cocktail.name}</Text>
            <View style={styles.badgeRow}>
              {cocktail.alcoholic && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cocktail.alcoholic}</Text>
                </View>
              )}
              {cocktail.category && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cocktail.category}</Text>
                </View>
              )}
              {cocktail.glass && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>🥃 {cocktail.glass}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.body}>

          {/* Tags */}
          {cocktail.tags && cocktail.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {cocktail.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Ingredients */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {cocktail.ingredients.map((ing, idx) => (
              <View key={idx} style={styles.ingredientRow}>
                <View style={styles.ingredientDot} />
                <Text style={styles.ingredientName}>{ing.name}</Text>
                {ing.measure ? (
                  <Text style={styles.ingredientMeasure}>{ing.measure}</Text>
                ) : null}
              </View>
            ))}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Text style={styles.instructions}>{cocktail.instructions}</Text>
          </View>

          {/* Bottom padding */}
          <View style={{ height: 40 }} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: '#4A4A4A', marginTop: 12, fontSize: 14 },
  errorText: { color: '#C9A84C', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    borderWidth: 1, borderColor: '#C9A84C', borderRadius: 20,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  retryText: { color: '#C9A84C', fontSize: 14 },

  // Hero
  heroContainer: { width: '100%', height: 320, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { width: '100%', height: '100%', backgroundColor: '#1C1C1C' },
  backOverlay: {
    position: 'absolute', top: 16, left: 16, zIndex: 10,
    backgroundColor: '#00000066', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  backArrow: { color: '#F5F0E8', fontSize: 16, fontWeight: '600' },
  heroGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 160,
    backgroundColor: 'transparent',
    // Simulated gradient using a dark overlay at the bottom
    borderBottomLeftRadius: 0,
    background: 'linear-gradient(transparent, #0A0A0A)',
  },
  heroMeta: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  heroName: { color: '#F5F0E8', fontSize: 26, fontWeight: '700', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    backgroundColor: '#00000088', borderRadius: 12, borderWidth: 1,
    borderColor: '#C9A84C44', paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { color: '#C9A84C', fontSize: 12 },

  // Body
  body: { padding: 20 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tag: {
    backgroundColor: '#C9A84C22', borderRadius: 12, borderWidth: 1,
    borderColor: '#C9A84C44', paddingHorizontal: 12, paddingVertical: 5,
  },
  tagText: { color: '#C9A84C', fontSize: 12 },

  // Sections
  section: { marginBottom: 20 },
  sectionTitle: {
    color: '#F5F0E8', fontSize: 16, fontWeight: '700',
    letterSpacing: 0.5, marginBottom: 14,
  },
  divider: { height: 1, backgroundColor: '#1C1C1C', marginBottom: 20 },

  // Ingredients
  ingredientRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  ingredientDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#C9A84C', marginRight: 12,
  },
  ingredientName: { flex: 1, color: '#F5F0E8', fontSize: 14 },
  ingredientMeasure: { color: '#C9A84C', fontSize: 13, fontWeight: '500' },

  // Instructions
  instructions: { color: '#A0A0A0', fontSize: 14, lineHeight: 22 },
});
