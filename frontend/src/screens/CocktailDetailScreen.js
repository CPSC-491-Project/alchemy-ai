// SCRUM-130: Cocktail Detail Screen
// Displays full cocktail record fetched via GET /api/cocktails/:id

import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView,
  StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { getCocktailById } from '../services/cocktailService';

export default function CocktailDetailScreen({ route, navigation }) {
  const { id, name } = route.params;
  const [cocktail, setCocktail] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    getCocktailById(id)
      .then(setCocktail)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#C9A84C" size="large" />
      </View>
    );
  }

  if (error || !cocktail) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Cocktail not found.'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── Hero Image ── */}
      {cocktail.strDrinkThumb ? (
        <Image source={{ uri: cocktail.strDrinkThumb }} style={styles.hero} />
      ) : (
        <View style={[styles.hero, styles.heroFallback]}>
          <Text style={styles.heroIcon}>⚗</Text>
        </View>
      )}

      {/* ── Back Button ── */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backOverlay}>
        <Text style={styles.backOverlayText}>←</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        {/* ── Name ── */}
        <Text style={styles.title}>{cocktail.strDrink}</Text>

        {/* ── Badges ── */}
        <View style={styles.badgeRow}>
          {cocktail.strCategory && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cocktail.strCategory}</Text>
            </View>
          )}
          {cocktail.strAlcoholic && (
            <View style={[styles.badge, styles.badgeGold]}>
              <Text style={[styles.badgeText, styles.badgeTextGold]}>
                {cocktail.strAlcoholic}
              </Text>
            </View>
          )}
          {cocktail.strGlass && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cocktail.strGlass}</Text>
            </View>
          )}
        </View>

        {/* ── Ingredients ── */}
        <Text style={styles.sectionTitle}>Ingredients</Text>
        <View style={styles.ingredientList}>
          {(cocktail.ingredients || []).map((ing, idx) => (
            <View key={idx} style={styles.ingredientRow}>
              <Text style={styles.ingredientName}>{ing.name}</Text>
              {ing.measure ? (
                <Text style={styles.ingredientMeasure}>{ing.measure}</Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* ── Instructions ── */}
        {cocktail.strInstructions && (
          <>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Text style={styles.instructions}>{cocktail.strInstructions}</Text>
          </>
        )}

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0A0A0A' },
  center:      { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
  hero:        { width: '100%', height: 300 },
  heroFallback:{ backgroundColor: '#1C1C1C', alignItems: 'center', justifyContent: 'center' },
  heroIcon:    { fontSize: 64, opacity: 0.3 },
  backOverlay: {
    position: 'absolute', top: 48, left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  backOverlayText: { color: '#F5F0E8', fontSize: 18 },
  content:     { padding: 20 },
  title:       { fontSize: 28, fontWeight: 'bold', color: '#F5F0E8', marginBottom: 12 },
  badgeRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  badge:       {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#1C1C1C',
  },
  badgeGold:   { borderColor: '#C9A84C', backgroundColor: '#C9A84C22' },
  badgeText:   { color: '#8A8A8A', fontSize: 12 },
  badgeTextGold: { color: '#C9A84C' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#F5F0E8', marginBottom: 12 },
  ingredientList: {
    backgroundColor: '#1C1C1C', borderRadius: 10,
    marginBottom: 24, overflow: 'hidden',
  },
  ingredientRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#2A2A2A',
  },
  ingredientName:    { color: '#F5F0E8', fontSize: 15 },
  ingredientMeasure: { color: '#C9A84C', fontSize: 15 },
  instructions: { color: '#A0A0A0', fontSize: 15, lineHeight: 24 },
  errorText:    { color: '#FF6B6B', fontSize: 15, marginBottom: 16 },
  backBtn:      { paddingVertical: 10, paddingHorizontal: 20 },
  backBtnText:  { color: '#C9A84C', fontSize: 15 },
});
