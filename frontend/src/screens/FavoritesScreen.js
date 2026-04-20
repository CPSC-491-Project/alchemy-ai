// frontend/src/screens/FavoritesScreen.js
// SCRUM-174 — Favorites screen UI
// SCRUM-122 — High-fidelity UI screens
// Assigned to: Allisa Warren

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme/index';

function FavoriteCard({ item, onPress, onUnfavorite }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.cardImageWrapper}>
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.cardPlaceholderText}>🍸</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => onUnfavorite(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.heartIcon}>♥</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        {item.category ? (
          <Text style={styles.cardMeta} numberOfLines={1}>
            {item.category}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function FavoritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleCardPress = (item) => {
    if (navigation) {
      navigation.navigate('CocktailDetail', { cocktailId: item.id, cocktail: item });
    }
  };

  const handleUnfavorite = (item) => {
    setFavorites((prev) => prev.filter((f) => f.id !== item.id));
  };

  const handleExplore = () => {
    if (navigation) {
      navigation.navigate('Search');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorites</Text>
        {favorites.length > 0 && (
          <Text style={styles.headerCount}>{favorites.length}</Text>
        )}
      </View>

      {favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>♡</Text>
          <Text style={styles.emptyHeading}>No favorites yet</Text>
          <Text style={styles.emptySubtext}>
            Recipes you love will appear here. Start exploring to find your next favorite cocktail.
          </Text>
          <TouchableOpacity style={styles.exploreButton} onPress={handleExplore}>
            <Text style={styles.exploreButtonText}>Explore Cocktails</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <FavoriteCard
              item={item}
              onPress={handleCardPress}
              onUnfavorite={handleUnfavorite}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: { ...Typography.headingS, color: Colors.textPrimary, flex: 1 },
  headerCount: { ...Typography.bodySmall, color: Colors.textSecondary },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  row: { justifyContent: 'space-between', marginBottom: Spacing.md },
  card: {
    width: '48.5%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardImageWrapper: { width: '100%', aspectRatio: 1 },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPlaceholderText: { fontSize: 36 },
  heartButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radius.full,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartIcon: { color: Colors.accent, fontSize: 14 },
  cardInfo: { padding: Spacing.sm },
  cardName: { ...Typography.cardTitleS, color: Colors.textPrimary },
  cardMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: { fontSize: 48, color: Colors.textSecondary, marginBottom: Spacing.lg },
  emptyHeading: {
    ...Typography.headingXS,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  exploreButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
  },
  exploreButtonText: {
    ...Typography.button,
    color: Colors.background,
    fontWeight: '600',
  },
});