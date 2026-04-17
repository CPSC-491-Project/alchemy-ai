// SCRUM-130: Cocktail Detail Screen
// Displays full cocktail record fetched via GET /api/cocktails/:id

import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView,
  StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { getCocktailById } from '../services/cocktailService';

export default function CocktailDetailScreen({ route, navigation }) {
  const { id } = route.params;
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
        <ActivityIndicator color={Colors.accent} size="large" />
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

        <View style={styles.bottomSpacer} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  center:       { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  hero:         { width: '100%', height: 300 },
  heroFallback: { backgroundColor: Colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  heroIcon:     { fontSize: 64, opacity: 0.3 },
  backOverlay:  {
    position: 'absolute', top: 48, left: Spacing.md,
    backgroundColor: Colors.accentDim, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  backOverlayText: { ...Typography.body, color: Colors.textPrimary, fontSize: 18 },
  content:      { padding: Spacing.md },
  title:        { ...Typography.heading, fontSize: 28, marginBottom: Spacing.sm },
  badgeRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
  badge:        {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceRaised,
  },
  badgeGold:      { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  badgeText:      { ...Typography.bodySmall },
  badgeTextGold:  { color: Colors.accent },
  sectionTitle:   { ...Typography.label, marginBottom: Spacing.sm },
  ingredientList: {
    backgroundColor: Colors.surfaceRaised, borderRadius: Radius.md,
    marginBottom: Spacing.lg, overflow: 'hidden',
  },
  ingredientRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  ingredientName:    { ...Typography.body },
  ingredientMeasure: { ...Typography.body, color: Colors.accent },
  instructions:      { ...Typography.body, color: Colors.textSecondary, lineHeight: 24 },
  errorText:         { ...Typography.body, color: Colors.error, marginBottom: Spacing.md },
  backBtn:           { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  backBtnText:       { ...Typography.body, color: Colors.accent },
  bottomSpacer:      { height: Spacing.xl },
});
