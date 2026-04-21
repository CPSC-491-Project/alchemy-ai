// frontend/src/screens/CabinetScreen.js
// SCRUM-148 — Cabinet UI Styling Improvements
// Assigned to: Allisa Warren
//
// Hi-fi redesign of the ingredient cabinet:
//   • 3-column grid of ingredient tiles (matches wireframe)
//   • Gold-accent category filter chips (All / Spirits / Mixers / Garnish)
//   • "In Stock" / "Out of Stock" badge treatment per tile
//   • Floating Action Button (FAB) for add — scan or manual entry
//   • Section header with ingredient count
//   • Pull-to-refresh, empty state, error banner preserved
//   • All logic and API calls unchanged (SCRUM-74 / SCRUM-75)
//
// Implements: FR-21, FR-22, NFR-17, NFR-18, NFR-19

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius, Opacity } from '../theme/index';
import {
  getCabinet,
  addIngredient,
  removeIngredient,
} from '../services/cabinetService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = ['spirit', 'mixer', 'garnish'];
const FILTER_TABS = ['All', 'Spirits', 'Mixers', 'Garnish'];
const FILTER_MAP = {
  All: null,
  Spirits: 'spirit',
  Mixers: 'mixer',
  Garnish: 'garnish',
};

// Tile sizing: 3-column grid with gutters
const GRID_PADDING = Spacing.lg;
const GRID_GAP = Spacing.sm;
const TILE_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

// Category emoji icons — graceful fallback if no image
const CATEGORY_ICON = {
  spirit: '🥃',
  mixer: '🍋',
  garnish: '🌿',
};

export default function CabinetScreen() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [fabOpen, setFabOpen] = useState(false);

  // Add-ingredient modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('spirit');
  const [formQuantity, setFormQuantity] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ─── Load cabinet on focus ──────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      loadCabinet();
    }, [])
  );

  async function loadCabinet() {
    try {
      setError(null);
      const data = await getCabinet();
      setIngredients(data);
    } catch {
      setError('Could not load your cabinet. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadCabinet();
  }

  // ─── Filtered data ──────────────────────────────────────────────────────────
  const filteredIngredients =
    FILTER_MAP[activeFilter] === null
      ? ingredients
      : ingredients.filter((i) => i.category === FILTER_MAP[activeFilter]);

  // ─── Delete ─────────────────────────────────────────────────────────────────
  function confirmDelete(item) {
    Alert.alert(
      'Remove Ingredient',
      `Remove "${item.name}" from your cabinet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => handleDelete(item.id),
        },
      ]
    );
  }

  async function handleDelete(id) {
    try {
      await removeIngredient(id);
      setIngredients((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not remove ingredient.');
    }
  }

  // ─── Add ────────────────────────────────────────────────────────────────────
  function openModal() {
    setFabOpen(false);
    setFormName('');
    setFormCategory('spirit');
    setFormQuantity('');
    setFormUnit('');
    setModalVisible(true);
  }

  async function handleAdd() {
    if (!formName.trim()) {
      Alert.alert('Required', 'Please enter an ingredient name.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await addIngredient({
        name: formName.trim(),
        category: formCategory,
        quantity: formQuantity.trim() || null,
        unit: formUnit.trim() || null,
      });
      setIngredients((prev) => [created, ...prev]);
      setModalVisible(false);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not add ingredient.');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ingredient tile ─────────────────────────────────────────────────
  function renderTile({ item }) {
    const inStock = true; // Future: wire to item.inStock once backend supports it
    return (
      <TouchableOpacity
        style={styles.tile}
        onLongPress={() => confirmDelete(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${inStock ? 'In Stock' : 'Out of Stock'}. Long press to remove.`}
        activeOpacity={0.75}
      >
        {/* Ingredient icon circle */}
        <View style={styles.tileIconCircle}>
          <Text style={styles.tileIcon}>
            {CATEGORY_ICON[item.category] ?? '🍾'}
          </Text>
        </View>

        {/* Name */}
        <Text style={styles.tileName} numberOfLines={2}>
          {item.name}
        </Text>

        {/* Stock badge */}
        <View
          style={[
            styles.stockBadge,
            inStock ? styles.stockBadgeIn : styles.stockBadgeOut,
          ]}
        >
          <Text
            style={[
              styles.stockBadgeText,
              inStock ? styles.stockBadgeTextIn : styles.stockBadgeTextOut,
            ]}
          >
            {inStock ? 'In Stock' : 'Out of Stock'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </SafeAreaView>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>My Cabinet</Text>
        <Text style={styles.ingredientCount}>
          {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* ── Gold divider ── */}
      <View style={styles.goldDivider} />

      {/* ── Error banner ── */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* ── Category filter chips ── */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.filterChip,
              activeFilter === tab && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(tab)}
            accessibilityRole="button"
            accessibilityState={{ selected: activeFilter === tab }}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === tab && styles.filterChipTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Grid or empty state ── */}
      {filteredIngredients.length === 0 && !error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🧪</Text>
          <Text style={styles.emptyText}>
            {activeFilter === 'All'
              ? 'Your cabinet is empty.'
              : `No ${activeFilter.toLowerCase()} yet.`}
          </Text>
          <Text style={styles.emptySubtext}>
            Tap the + button to add your first ingredient.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredIngredients}
          keyExtractor={(item) => item.id}
          renderItem={renderTile}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
        />
      )}

      {/* ── FAB ── */}
      {fabOpen && (
        <View style={styles.fabMenu}>
          {/* Scan option — future hook for SCRUM-151 */}
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setFabOpen(false);
              Alert.alert(
                'Scan Ingredient',
                'OCR scanning coming in Sprint 4 (SCRUM-151).'
              );
            }}
            accessibilityRole="button"
            accessibilityLabel="Scan ingredient label"
          >
            <Text style={styles.fabMenuItemText}>Scan Label</Text>
            <View style={styles.fabMenuItemIcon}>
              <Text style={styles.fabMenuItemIconText}>📷</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={openModal}
            accessibilityRole="button"
            accessibilityLabel="Add ingredient manually"
          >
            <Text style={styles.fabMenuItemText}>Add Manually</Text>
            <View style={styles.fabMenuItemIcon}>
              <Text style={styles.fabMenuItemIconText}>✏️</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB backdrop */}
      {fabOpen && (
        <TouchableOpacity
          style={styles.fabBackdrop}
          onPress={() => setFabOpen(false)}
          activeOpacity={1}
          accessibilityLabel="Close menu"
        />
      )}

      {/* FAB button */}
      <TouchableOpacity
        style={[styles.fab, fabOpen && styles.fabOpen]}
        onPress={() => setFabOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={fabOpen ? 'Close add menu' : 'Add ingredient'}
      >
        <Text style={styles.fabIcon}>{fabOpen ? '✕' : '+'}</Text>
      </TouchableOpacity>

      {/* ── Add Ingredient Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Modal handle */}
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Add Ingredient</Text>

            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rum, Lime Juice"
              placeholderTextColor={Colors.textHint}
              value={formName}
              onChangeText={setFormName}
              autoFocus
              accessibilityLabel="Ingredient name"
            />

            <Text style={styles.label}>Category *</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    formCategory === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setFormCategory(cat)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: formCategory === cat }}
                >
                  <Text style={styles.categoryChipIcon}>
                    {CATEGORY_ICON[cat]}
                  </Text>
                  <Text
                    style={[
                      styles.categoryChipText,
                      formCategory === cat && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Quantity (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 750"
              placeholderTextColor={Colors.textHint}
              value={formQuantity}
              onChangeText={setFormQuantity}
              keyboardType="numeric"
              accessibilityLabel="Quantity"
            />

            <Text style={styles.label}>Unit (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. ml, oz, bottle"
              placeholderTextColor={Colors.textHint}
              value={formUnit}
              onChangeText={setFormUnit}
              accessibilityLabel="Unit"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleAdd}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Confirm add ingredient"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <Text style={styles.confirmText}>Add to Cabinet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  screenTitle: {
    ...Typography.headingM,
    color: Colors.textPrimary,
  },
  ingredientCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 4,
  },

  // ── Gold divider ──
  goldDivider: {
    height: 1,
    backgroundColor: Colors.accent,
    opacity: Opacity.goldDivider,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },

  // ── Error ──
  errorBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.errorSurface,
    borderRadius: Radius.md,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
  },

  // ── Filter chips ──
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: Colors.accentSubtle,
    borderColor: Colors.accent,
  },
  filterChipText: {
    ...Typography.labelSmall,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.accent,
  },

  // ── Grid ──
  grid: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100, // room above FAB
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  // ── Ingredient tile ──
  tile: {
    width: TILE_SIZE,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    alignItems: 'center',
    minHeight: TILE_SIZE + 20,
  },
  tileIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.accent,
    opacity: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  tileIcon: {
    fontSize: 22,
  },
  tileName: {
    ...Typography.caption,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    lineHeight: 15,
  },

  // Stock badge
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  stockBadgeIn: {
    backgroundColor: '#4CAF7222', // success tint
  },
  stockBadgeOut: {
    backgroundColor: Colors.errorSurface,
  },
  stockBadgeText: {
    fontSize: 9,
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.3,
  },
  stockBadgeTextIn: {
    color: Colors.success,
  },
  stockBadgeTextOut: {
    color: Colors.error,
  },

  // ── Empty state ──
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.headingXS,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── FAB ──
  fabBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 10,
  },
  fabMenu: {
    position: 'absolute',
    bottom: 90,
    right: Spacing.lg,
    alignItems: 'flex-end',
    zIndex: 20,
    gap: Spacing.sm,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fabMenuItemText: {
    ...Typography.labelMedium,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  fabMenuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabMenuItemIconText: {
    fontSize: 18,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabOpen: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  fabIcon: {
    fontSize: 24,
    color: Colors.background,
    lineHeight: 28,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    borderTopWidth: 1,
    borderColor: Colors.accent + '44',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: Radius.pill,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...Typography.headingXS,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    ...Typography.bodyMedium,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Category chips in modal
  categoryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  categoryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  categoryChipActive: {
    backgroundColor: Colors.accentSubtle,
    borderColor: Colors.accent,
  },
  categoryChipIcon: {
    fontSize: 14,
  },
  categoryChipText: {
    ...Typography.labelSmall,
    color: Colors.textMuted,
    textTransform: 'capitalize',
  },
  categoryChipTextActive: {
    color: Colors.accent,
  },

  // Modal action buttons
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelText: {
    ...Typography.labelMedium,
    color: Colors.textSecondary,
  },
  confirmButton: {
    flex: 2,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  confirmText: {
    ...Typography.labelMedium,
    color: Colors.background,
  },
});
