// =============================================================
// Alchemy AI — CocktailCard Component
// SCRUM-109 | feature/SCRUM-109-cocktail-card | Allisa Warren
// =============================================================
//
// Props
// ─────────────────────────────────────────────────────────────
//  imageUri   string | null   — remote or local image URI
//  drinkName  string (req)    — cocktail name
//  tags       string[]        — style / flavour tags e.g. ['Fruity', 'Strong']
//  rating     number          — 0–5, supports half-stars
//  matchPct   number | null   — 0–100 ingredient match %; omit to hide badge
//  onPress    function        — tap handler for the whole card
//  style      object          — additional container style overrides
// =============================================================

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';

// ─── Star Rating ─────────────────────────────────────────────
const StarRating = ({ rating = 0, max = 5 }) => {
  const stars = [];
  for (let i = 1; i <= max; i++) {
    let fill;
    if (rating >= i)            fill = 'full';
    else if (rating >= i - 0.5) fill = 'half';
    else                        fill = 'empty';
    stars.push(
      <View key={i} style={styles.starWrap}>
        <Text style={[styles.star, styles.starEmpty]}>★</Text>
        {fill !== 'empty' && (
          <View style={[styles.starFillClip, fill === 'half' && { width: '50%' }]}>
            <Text style={[styles.star, styles.starFilled]}>★</Text>
          </View>
        )}
      </View>
    );
  }
  return <View style={styles.starsRow}>{stars}</View>;
};

// ─── Match Badge ──────────────────────────────────────────────
const MatchBadge = ({ pct }) => {
  if (pct == null) return null;
  const clamped = Math.min(100, Math.max(0, Math.round(pct)));
  const badgeStyle =
    clamped === 100 ? styles.matchBadgePerfect
    : clamped >= 50  ? styles.matchBadgeGood
    :                  styles.matchBadgeLow;
  return (
    <View style={[styles.matchBadge, badgeStyle]}>
      <Text style={styles.matchBadgeText}>{clamped}% match</Text>
    </View>
  );
};

// ─── Main Component ───────────────────────────────────────────
const CocktailCard = ({
  imageUri = null,
  drinkName = '',
  tags = [],
  rating = 0,
  matchPct = null,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, style]}
      accessibilityRole="button"
      accessibilityLabel={`${drinkName}, ${Math.round(rating * 10) / 10} stars${matchPct != null ? `, ${Math.round(matchPct)}% match` : ''}`}
    >
      {/* ── Image Area ── */}
      <View style={styles.imagePlaceholder}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackIcon}>⚗</Text>
          </View>
        )}
        <View style={styles.badgeOverlay}>
          <MatchBadge pct={matchPct} />
        </View>
      </View>

      {/* ── Info Area ── */}
      <View style={styles.info}>
        <Text style={styles.drinkName} numberOfLines={1} ellipsizeMode="tail">
          {drinkName}
        </Text>
        {tags.length > 0 && (
          <View style={styles.tagsRow}>
            {tags.slice(0, 3).map((tag, idx) => (
              <View key={idx} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
        <StarRating rating={rating} />
      </View>
    </TouchableOpacity>
  );
};

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    width: 180,
  },
  imagePlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#2A2A2A',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackIcon: {
    fontSize: 40,
    opacity: 0.35,
  },
  badgeOverlay: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
  },
  matchBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  matchBadgeGood: {
    backgroundColor: `${Colors.accent}22`,
    borderColor: Colors.accent,
  },
  matchBadgePerfect: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  matchBadgeLow: {
    backgroundColor: `${Colors.accentDim}`,
    borderColor: `${Colors.accent}55`,
  },
  matchBadgeText: {
    ...Typography.label,
    fontSize: 10,
    letterSpacing: 0.8,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  info: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  drinkName: {
    ...Typography.body,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  tag: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  starWrap: {
    width: 14,
    height: 14,
    position: 'relative',
  },
  star: {
    fontSize: 13,
    lineHeight: 14,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  starEmpty: {
    color: Colors.border,
  },
  starFilled: {
    color: Colors.accent,
  },
  starFillClip: {
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
});

export default CocktailCard;
