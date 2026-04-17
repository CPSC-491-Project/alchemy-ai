// frontend/src/screens/MyCabinetScreen.js
// SCRUM-175 — My Cabinet screen in Favorites tab
//
// Subtask of SCRUM-151 (Image-Based Ingredient Scanning) and design baseline
// from SCRUM-74. Renders the cabinet as a 2-column grid of circular-avatar
// cards with category filter chips at the top and a floating `+` button that
// opens an action sheet with two options: Scan or Enter manually.
//
// Coexists with the existing CabinetScreen.js (Allisa's SCRUM-74/75 build);
// a follow-up ticket should unify them. The old screen is still reachable via
// the `IngredientCabinet` stack route; this new one lives in the Favorites tab.

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Modal, TextInput, ActivityIndicator, SafeAreaView,
  Alert, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { getCabinet, addIngredient } from '../services/cabinetService';

// ─── Category filter definitions ─────────────────────────────────────────────
// Keys map 1:1 to the Firestore schema (SCRUM-70). 'all' is a UI-only wildcard.
const FILTERS = [
  { key: 'all',     label: 'All'     },
  { key: 'spirit',  label: 'Spirits' },
  { key: 'mixer',   label: 'Mixers'  },
  { key: 'garnish', label: 'Garnish' },
];

const CATEGORY_OPTIONS = ['spirit', 'mixer', 'garnish']; // for the manual entry form

export default function MyCabinetScreen() {
  const navigation = useNavigation();

  // ─── Data state ────────────────────────────────────────────────────────────
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState(null);

  // ─── UI state ──────────────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter]     = useState('all');
  const [fabSheetOpen, setFabSheetOpen]     = useState(false);
  const [manualOpen, setManualOpen]         = useState(false);
  const [outOfStock, setOutOfStock]         = useState({}); // local-only toggle, see TODO below

  // ─── Manual entry form state ───────────────────────────────────────────────
  const [formName, setFormName]         = useState('');
  const [formCategory, setFormCategory] = useState('spirit');
  const [formQuantity, setFormQuantity] = useState('');
  const [formUnit, setFormUnit]         = useState('');
  const [submitting, setSubmitting]     = useState(false);

  // ─── Load on focus (same pattern as CabinetScreen) ─────────────────────────
  useFocusEffect(
    useCallback(() => {
      loadCabinet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ─── Derived: filtered ingredient list ─────────────────────────────────────
  const visibleIngredients = useMemo(() => {
    if (activeFilter === 'all') return ingredients;
    return ingredients.filter((i) => i.category === activeFilter);
  }, [ingredients, activeFilter]);

  // ─── FAB + action sheet handlers ───────────────────────────────────────────
  const openFabSheet  = () => setFabSheetOpen(true);
  const closeFabSheet = () => setFabSheetOpen(false);

  const handleScanTap = () => {
    closeFabSheet();
    // The `Scan` route is registered on feature/image-scanning (SCRUM-151 child
    // work) — not yet in develop. Wrap in try/catch so we fail gracefully until
    // the merge lands. Matches the lazy-import pattern in RootNavigator.js.
    try {
      navigation.navigate('Scan');
    } catch (err) {
      Alert.alert(
        'Scan coming soon',
        'Camera scanning will be available once SCRUM-151 merges to develop.'
      );
    }
  };

  const handleManualTap = () => {
    closeFabSheet();
    setManualOpen(true);
  };

  // ─── Manual entry submit ───────────────────────────────────────────────────
  async function handleSubmitManual() {
    const name = formName.trim();
    if (!name) {
      Alert.alert('Missing name', 'Please enter an ingredient name.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { name, category: formCategory };
      if (formQuantity.trim()) payload.quantity = formQuantity.trim();
      if (formUnit.trim())     payload.unit     = formUnit.trim();
      await addIngredient(payload);
      // Reset form + close modal, then refresh the list
      setFormName(''); setFormCategory('spirit');
      setFormQuantity(''); setFormUnit('');
      setManualOpen(false);
      loadCabinet();
    } catch (err) {
      Alert.alert('Could not add ingredient', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Status toggle (VISUAL ONLY — see TODO) ────────────────────────────────
  // TODO(SCRUM-175 followup): Add an `inStock` boolean to the Firestore
  // ingredient schema so this toggle can persist. For now the toggle is a
  // local UI state so reviewers can see the active/inactive card treatment.
  const toggleStock = (id) =>
    setOutOfStock((prev) => ({ ...prev, [id]: !prev[id] }));

  // ─── Renderers ─────────────────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.headerIcon}
        accessibilityLabel="Go back"
        hitSlop={10}
      >
        <Ionicons name="arrow-back" size={22} color={Colors.accent} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>My Cabinet</Text>
      <TouchableOpacity
        onPress={openFabSheet}
        style={styles.headerIcon}
        accessibilityLabel="Add ingredient"
        hitSlop={10}
      >
        <Ionicons name="add" size={26} color={Colors.accent} />
      </TouchableOpacity>
    </View>
  );

  const renderFilterRow = () => (
    <View style={styles.filterRow}>
      {FILTERS.map((f) => {
        const active = activeFilter === f.key;
        return (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderCard = ({ item }) => {
    const isOut = !!outOfStock[item.id];
    const initial = (item.name || '?').trim().charAt(0).toUpperCase();
    return (
      <View style={[styles.card, !isOut ? styles.cardActive : styles.cardInactive]}>
        <View style={[styles.avatar, !isOut ? styles.avatarActive : styles.avatarInactive]}>
          <Text style={[styles.avatarLetter, !isOut && styles.avatarLetterActive]}>
            {initial}
          </Text>
        </View>
        <Text style={[styles.cardName, isOut && styles.cardNameDim]} numberOfLines={1}>
          {item.name}
        </Text>
        <TouchableOpacity
          onPress={() => toggleStock(item.id)}
          style={[styles.stockPill, isOut ? styles.stockPillOut : styles.stockPillIn]}
        >
          <Text style={[styles.stockPillText, isOut && styles.stockPillTextOut]}>
            {isOut ? 'Add Stock' : 'In Stock'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Your cabinet is empty</Text>
      <Text style={styles.emptySub}>
        Tap the + button to scan a bottle or enter an ingredient by hand.
      </Text>
    </View>
  );

  // ─── Action sheet modal (Scan / Enter manually) ────────────────────────────
  const renderFabSheet = () => (
    <Modal
      visible={fabSheetOpen}
      transparent
      animationType="fade"
      onRequestClose={closeFabSheet}
    >
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeFabSheet}>
        <View style={styles.sheet}>
          <TouchableOpacity style={styles.sheetRow} onPress={handleScanTap}>
            <Ionicons name="camera" size={22} color={Colors.accent} />
            <View style={styles.sheetTextBlock}>
              <Text style={styles.sheetRowTitle}>Scan ingredient</Text>
              <Text style={styles.sheetRowSub}>Use the camera or pick a photo</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.sheetDivider} />
          <TouchableOpacity style={styles.sheetRow} onPress={handleManualTap}>
            <Ionicons name="create" size={22} color={Colors.accent} />
            <View style={styles.sheetTextBlock}>
              <Text style={styles.sheetRowTitle}>Enter manually</Text>
              <Text style={styles.sheetRowSub}>Type the name and category</Text>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ─── Manual entry modal ────────────────────────────────────────────────────
  const renderManualModal = () => (
    <Modal
      visible={manualOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setManualOpen(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add Ingredient</Text>

          <Text style={styles.formLabel}>Name</Text>
          <TextInput
            value={formName}
            onChangeText={setFormName}
            placeholder="e.g. Bourbon"
            placeholderTextColor={Colors.textMuted}
            style={styles.formInput}
          />

          <Text style={styles.formLabel}>Category</Text>
          <View style={styles.filterRow}>
            {CATEGORY_OPTIONS.map((c) => {
              const active = formCategory === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setFormCategory(c)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>Quantity</Text>
              <TextInput
                value={formQuantity}
                onChangeText={setFormQuantity}
                placeholder="750"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                style={styles.formInput}
              />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={styles.formLabel}>Unit</Text>
              <TextInput
                value={formUnit}
                onChangeText={setFormUnit}
                placeholder="ml"
                placeholderTextColor={Colors.textMuted}
                style={styles.formInput}
              />
            </View>
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.formBtn, styles.formBtnSecondary]}
              onPress={() => setManualOpen(false)}
              disabled={submitting}
            >
              <Text style={styles.formBtnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formBtn, styles.formBtnPrimary]}
              onPress={handleSubmitManual}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color={Colors.background} />
                : <Text style={styles.formBtnPrimaryText}>Add</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ─── Root ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderFilterRow()}

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={visibleIngredients}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadCabinet(); }}
              tintColor={Colors.accent}
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={openFabSheet}
        style={styles.fab}
        accessibilityLabel="Add ingredient"
      >
        <Ionicons name="add" size={30} color={Colors.background} />
      </TouchableOpacity>

      {renderFabSheet()}
      {renderManualModal()}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const CARD_RADIUS = 14;

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  centerFill:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  errorText:    { ...Typography.body, color: Colors.error, textAlign: 'center' },

  // Header
  header:       {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  headerIcon:   { width: 30, alignItems: 'center' },
  headerTitle:  { ...Typography.heading, fontSize: 22 },

  // Filter chips
  filterRow:    {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, marginBottom: Spacing.md,
  },
  chip:         {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipActive:     { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  chipText:       { ...Typography.bodySmall, color: Colors.textSecondary },
  chipTextActive: { color: Colors.accent, fontWeight: '600' },

  // Grid / Cards
  gridContent:  { paddingHorizontal: Spacing.md, paddingBottom: 120 },
  gridRow:      { justifyContent: 'space-between', marginBottom: Spacing.md },
  card:         {
    width: '48%', padding: Spacing.md, borderRadius: CARD_RADIUS,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    minHeight: 180,
  },
  cardActive:   { backgroundColor: Colors.surface, borderColor: Colors.accent },
  cardInactive: { backgroundColor: Colors.surface, borderColor: Colors.border, opacity: 0.6 },

  avatar:       {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, marginBottom: Spacing.sm,
  },
  avatarActive:   { borderColor: Colors.accent },
  avatarInactive: { borderColor: Colors.border },
  avatarLetter:   { ...Typography.heading, fontSize: 30, color: Colors.textSecondary },
  avatarLetterActive: { color: Colors.accent },

  cardName:     { ...Typography.body, marginBottom: Spacing.sm, color: Colors.textPrimary },
  cardNameDim:  { color: Colors.textSecondary },

  stockPill:      {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: Radius.full,
    borderWidth: 1,
  },
  stockPillIn:    { backgroundColor: Colors.accent, borderColor: Colors.accent },
  stockPillOut:   { backgroundColor: 'transparent', borderColor: Colors.border },
  stockPillText:  { ...Typography.label, fontSize: 11, color: Colors.background, letterSpacing: 0.6 },
  stockPillTextOut:{ color: Colors.textSecondary },

  // Empty state
  empty:        { alignItems: 'center', padding: Spacing.xl, marginTop: Spacing.xl },
  emptyTitle:   { ...Typography.heading, fontSize: 18, marginBottom: Spacing.sm },
  emptySub:     { ...Typography.bodySmall, color: Colors.textSecondary, textAlign: 'center' },

  // FAB
  fab:          {
    position: 'absolute', right: Spacing.lg, bottom: Spacing.xl,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },

  // Sheets & modals
  modalBackdrop:{
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet:        {
    backgroundColor: Colors.surfaceRaised,
    borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    paddingVertical: Spacing.md,
  },
  sheetRow:     {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  sheetTextBlock:{ marginLeft: Spacing.md },
  sheetRowTitle: { ...Typography.body, color: Colors.textPrimary },
  sheetRowSub:   { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },
  sheetDivider:  { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },

  // Manual entry form
  formCard:     {
    backgroundColor: Colors.surfaceRaised,
    borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
  },
  formTitle:    { ...Typography.heading, fontSize: 20, marginBottom: Spacing.md },
  formLabel:    { ...Typography.label, marginTop: Spacing.sm, marginBottom: 6 },
  formInput:    {
    backgroundColor: Colors.surface, color: Colors.textPrimary,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  formRow:      { flexDirection: 'row', marginTop: Spacing.sm },
  formActions:  { flexDirection: 'row', marginTop: Spacing.lg, gap: Spacing.sm },
  formBtn:      { flex: 1, paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center' },
  formBtnSecondary:    { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  formBtnSecondaryText:{ ...Typography.body, color: Colors.textPrimary },
  formBtnPrimary:      { backgroundColor: Colors.accent },
  formBtnPrimaryText:  { ...Typography.body, color: Colors.background, fontWeight: '700' },
});
