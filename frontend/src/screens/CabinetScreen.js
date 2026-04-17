// frontend/src/screens/CabinetScreen.js
// SCRUM-74 — Frontend: Build Ingredient Cabinet screen UI
// SCRUM-75 — Frontend: Wire Ingredient Cabinet screen to backend API
// SCRUM-148 — Cabinet UI Styling Improvements: category filtering + sorting
// Assigned to: Allisa Warren / Mohamed Alqubaisi
//
// Displays the user's ingredient cabinet as dark-theme cards.
// Calls cabinetService.js for all GET / POST / DELETE operations.
// Follows design system tokens from theme/index.js.
// Implements: FR-21 (bottom nav), FR-22 (left panel access), NFR-17 (nav bar persistence),
//             NFR-18 (panel responsiveness), NFR-19 (accessibility).

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
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../theme/index';
import { getCabinet, addIngredient, removeIngredient } from '../services/cabinetService';
import EmptyState from '../components/EmptyState';


// ─── Category options matching the Firestore schema (SCRUM-70) ───────────────
const CATEGORIES = ['spirit', 'mixer', 'garnish'];

// ─── Filter options including 'all' ──────────────────────────────────────────
const FILTER_OPTIONS = ['all', 'spirit', 'mixer', 'garnish'];

export default function CabinetScreen() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter + sort state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOption, setSortOption] = useState('date');

  // Add-ingredient modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('spirit');
  const [formQuantity, setFormQuantity] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ─── Load cabinet on screen focus ──────────────────────────────────────────
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

  // ─── Filter logic ───────────────────────────────────────────────────────────
  const filteredIngredients = ingredients.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  // ─── Sort logic (applied after filter) ─────────────────────────────────────
  const sortedIngredients = [...filteredIngredients].sort((a, b) => {
    if (sortOption === 'name') {
      return a.name.localeCompare(b.name);
    }
    // default: dateAdded descending (latest first), handle undefined safely
    const aTime = a.dateAdded?.seconds ? a.dateAdded.seconds * 1000 : 0;
    const bTime = b.dateAdded?.seconds ? b.dateAdded.seconds * 1000 : 0;
    return new Date(bTime) - new Date(aTime);
  });

  // ─── Delete ingredient ──────────────────────────────────────────────────────
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

  // ─── Add ingredient ─────────────────────────────────────────────────────────
  function openModal() {
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

  // ─── Filter + sort row (used as FlatList ListHeaderComponent) ───────────────
  function renderListHeader() {
    return (
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.filterChip,
                selectedCategory === option && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedCategory === option }}
              accessibilityLabel={`Filter by ${option}`}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedCategory === option && styles.filterTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Sort toggle — right side of the same row */}
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() =>
              setSortOption((prev) => (prev === 'name' ? 'date' : 'name'))
            }
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${sortOption === 'name' ? 'date' : 'name'}`}
          >
            <Text style={styles.sortButtonText}>
              Sort: {sortOption === 'name' ? 'A–Z' : 'Date'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── Render ingredient card ─────────────────────────────────────────────────
  function renderIngredient({ item }) {
    return (
      <View style={styles.card} accessibilityRole="none">
        <View style={styles.cardContent}>
          <Text style={styles.ingredientName} accessibilityRole="text">
            {item.name}
          </Text>
          <Text style={styles.ingredientMeta}>
            {item.category}
            {item.quantity
              ? `  ·  ${item.quantity}${item.unit ? ' ' + item.unit : ''}`
              : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => confirmDelete(item)}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.name}`}
        >
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Cabinet</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openModal}
          accessibilityRole="button"
          accessibilityLabel="Add ingredient"
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Error state */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Ingredient list — filter row lives inside as ListHeaderComponent */}
      {!error && (
          <FlatList
            data={sortedIngredients}
            keyExtractor={(item) => item.id}
            renderItem={renderIngredient}
            ListHeaderComponent={renderListHeader}
            ListEmptyComponent={
              <EmptyState
                icon="🍸"
                message="No ingredients in your cabinet"
                subtext="Add ingredients to start discovering cocktails"
              />
            }
            contentContainerStyle={[
              styles.list,
              sortedIngredients.length === 0 && styles.listEmpty,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.accent}
              />
            }
          />
        )}

      {/* Add Ingredient Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Ingredient</Text>

            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rum, Lime Juice"
              placeholderTextColor={Colors.textMuted}
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
              placeholderTextColor={Colors.textMuted}
              value={formQuantity}
              onChangeText={setFormQuantity}
              keyboardType="numeric"
              accessibilityLabel="Quantity"
            />

            <Text style={styles.label}>Unit (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. ml, oz, bottle"
              placeholderTextColor={Colors.textMuted}
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
                  <Text style={styles.confirmText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles — all values from theme/index.js tokens ─────────────────────────
const styles = StyleSheet.create({
  listEmpty: {
    flex: 1,
  },
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.heading,
    color: Colors.textPrimary,
  },
  addButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  addButtonText: {
    ...Typography.labelMedium,
    color: Colors.background,
  },
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
  // ─── Filter row ─────────────────────────────────────────────────────────────
  filterContainer: {
    marginBottom: Spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterText: {
    ...Typography.labelSmall,
    color: Colors.textMuted,
    textTransform: 'capitalize',
  },
  filterTextActive: {
    color: Colors.background,
  },
  sortButton: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sortButtonText: {
    ...Typography.labelSmall,
    color: Colors.textMuted,
  },
  // ─── List ────────────────────────────────────────────────────────────────────
  list: {
    paddingBottom: Spacing.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  ingredientName: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  ingredientMeta: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  deleteButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  deleteIcon: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtext: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  // ─── Modal ───────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  modalTitle: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.labelMedium,
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
  categoryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  categoryChipText: {
    ...Typography.labelSmall,
    color: Colors.textMuted,
    textTransform: 'capitalize',
  },
  categoryChipTextActive: {
    color: Colors.background,
  },
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
    flex: 1,
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