// frontend/src/screens/CabinetScreen.js
// SCRUM-148 — Cabinet UI Styling Improvements
// SCRUM-195 — Fix: useFonts crash, navigation wiring, mock data fallback
// Assigned to: Allisa Warren
//
// SCRUM-195 fixes:
//   1. useFonts — CormorantGaramond_300Light + DMSans_400Regular + DMSans_500Medium
//      Missing this causes a silent blank-screen crash on web.
//      Return null until fonts load (same pattern as ProfileScreen).
//   2. navigation prop accepted — back button + navigate('Scan') from FAB
//   3. Mock data fallback — if getCabinet() returns [] (backend down/unauthed),
//      seed MOCK_INGREDIENTS so the UI is fully testable without the server.
//      A gold "Mock data" banner is shown so it is obvious in dev.
//   4. Scan FAB — navigates to 'Scan' root-stack screen (SCRUM-151/185)
//   5. Delete is optimistic — removes locally first, skips API for mock items
//
// Implements: FR-21, FR-22, FR-23, NFR-17, NFR-18, NFR-19

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, StyleSheet, SafeAreaView,
  Alert, RefreshControl, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useFonts, CormorantGaramond_300Light } from '@expo-google-fonts/cormorant-garamond';
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Opacity } from '../theme/index';
import { getCabinet, addIngredient, removeIngredient } from '../services/cabinetService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES  = ['spirit', 'mixer', 'garnish'];
const FILTER_TABS = ['All', 'Spirits', 'Mixers', 'Garnish'];
const FILTER_MAP  = { All: null, Spirits: 'spirit', Mixers: 'mixer', Garnish: 'garnish' };

const GRID_PADDING = Spacing.lg;
const GRID_GAP     = Spacing.sm;
const TILE_SIZE    = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

const CATEGORY_ICON = { spirit: '🥃', mixer: '🍋', garnish: '🌿' };

// Shown when backend is unreachable — lets you test every UI state without the server.
const MOCK_INGREDIENTS = [
  { id: 'mock-1',  name: 'Bourbon',      category: 'spirit',  quantity: '750', unit: 'ml' },
  { id: 'mock-2',  name: 'Gin',          category: 'spirit',  quantity: '750', unit: 'ml' },
  { id: 'mock-3',  name: 'Rum',          category: 'spirit',  quantity: '700', unit: 'ml' },
  { id: 'mock-4',  name: 'Tequila',      category: 'spirit',  quantity: '750', unit: 'ml' },
  { id: 'mock-5',  name: 'Vermouth',     category: 'mixer',   quantity: '375', unit: 'ml' },
  { id: 'mock-6',  name: 'Campari',      category: 'mixer',   quantity: '700', unit: 'ml' },
  { id: 'mock-7',  name: 'Simple Syrup', category: 'mixer',   quantity: '240', unit: 'ml' },
  { id: 'mock-8',  name: 'Lime Juice',   category: 'mixer',   quantity: '120', unit: 'ml' },
  { id: 'mock-9',  name: 'Orange Peel',  category: 'garnish', quantity: null,  unit: null  },
  { id: 'mock-10', name: 'Maraschino',   category: 'garnish', quantity: null,  unit: null  },
  { id: 'mock-11', name: 'Mint',         category: 'garnish', quantity: null,  unit: null  },
];

function getStockLevel(ingredient) {
  const q = (ingredient.quantity || '').toString().toLowerCase().trim();
  if (!q) return 'in';
  if (/empty|out|none|finished|0$|zero/.test(q)) return 'out';
  if (/low|little|almost|half|quarter|few|running/.test(q)) return 'low';
  return 'in';
}

export default function CabinetScreen({ navigation }) {
  // FIX 1: Font loading — MUST be first hook.
  // Screens using Cormorant/DMSans without useFonts crash silently on web
  // (blank screen, no UI error). Check browser console for the real message.
  const [fontsLoaded] = useFonts({
    CormorantGaramond_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  const [ingredients,  setIngredients]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState(null);
  const [usingMock,    setUsingMock]    = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [fabOpen,      setFabOpen]      = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formName,     setFormName]     = useState('');
  const [formCategory, setFormCategory] = useState('spirit');
  const [formQuantity, setFormQuantity] = useState('');
  const [formUnit,     setFormUnit]     = useState('');
  const [submitting,   setSubmitting]   = useState(false);

  useFocusEffect(useCallback(() => { loadCabinet(); }, []));

  async function loadCabinet() {
    try {
      setError(null);
      setUsingMock(false);
      const data = await getCabinet();
      // FIX 3: getCabinet() returns [] when backend is down or user unauthed.
      // Fall back to mock data so the grid is always testable.
      if (data.length === 0) {
        setIngredients(MOCK_INGREDIENTS);
        setUsingMock(true);
      } else {
        setIngredients(data);
      }
    } catch {
      setError('Could not load your cabinet. Pull down to retry.');
      setIngredients(MOCK_INGREDIENTS);
      setUsingMock(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() { setRefreshing(true); loadCabinet(); }

  const filtered = FILTER_MAP[activeFilter] === null
    ? ingredients
    : ingredients.filter((i) => i.category === FILTER_MAP[activeFilter]);

  function confirmDelete(item) {
    Alert.alert('Remove Ingredient', `Remove "${item.name}" from your cabinet?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => handleDelete(item.id) },
    ]);
  }

  async function handleDelete(id) {
    setIngredients((prev) => prev.filter((i) => i.id !== id)); // optimistic
    if (usingMock) return;
    try {
      await removeIngredient(id);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not remove ingredient.');
      loadCabinet();
    }
  }

  function openModal() {
    setFabOpen(false);
    setFormName(''); setFormCategory('spirit'); setFormQuantity(''); setFormUnit('');
    setModalVisible(true);
  }

  async function handleAdd() {
    if (!formName.trim()) { Alert.alert('Required', 'Please enter an ingredient name.'); return; }
    setSubmitting(true);
    try {
      const payload = { name: formName.trim(), category: formCategory, quantity: formQuantity.trim() || null, unit: formUnit.trim() || null };
      if (usingMock) {
        setIngredients((prev) => [{ id: `mock-${Date.now()}`, ...payload }, ...prev]);
      } else {
        const created = await addIngredient(payload);
        setIngredients((prev) => [created, ...prev]);
      }
      setModalVisible(false);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not add ingredient.');
    } finally {
      setSubmitting(false);
    }
  }

  // FIX 2: CabinetScreen is a root-stack screen, so navigation prop works directly.
  // (Tab screens need navigation.getParent() to reach root-stack — not the case here.)
  function goBack()   { navigation?.canGoBack() && navigation.goBack(); }
  function goToScan() { setFabOpen(false); navigation ? navigation.navigate('Scan') : Alert.alert('Scan', 'OCR scanning coming soon (SCRUM-151).'); }

  // Font guard — must be after all hooks
  if (!fontsLoaded) return null;

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
        <TouchableOpacity onPress={goBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={Colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.screenTitle}>My Cabinet</Text>
          <Text style={styles.ingredientCount}>{ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.goldDivider} />

      {/* Mock data banner */}
      {usingMock && (
        <View style={styles.mockBanner}>
          <Ionicons name="flask-outline" size={12} color={Colors.accent} />
          <Text style={styles.mockBannerText}>  Mock data — connect /api/cabinet to see real cabinet</Text>
        </View>
      )}

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity key={tab} style={[styles.filterChip, activeFilter === tab && styles.filterChipActive]} onPress={() => setActiveFilter(tab)} accessibilityRole="button" accessibilityState={{ selected: activeFilter === tab }}>
            <Text style={[styles.filterChipText, activeFilter === tab && styles.filterChipTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Grid or empty state */}
      {filtered.length === 0 && !error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🧪</Text>
          <Text style={styles.emptyText}>{activeFilter === 'All' ? 'Your cabinet is empty.' : `No ${activeFilter.toLowerCase()} yet.`}</Text>
          <Text style={styles.emptySubtext}>Tap the + button to add your first ingredient.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const stockLevel = getStockLevel(item);
            const badgeStyle = stockLevel === 'out' ? styles.stockBadgeOut : stockLevel === 'low' ? styles.stockBadgeLow : styles.stockBadgeIn;
            const badgeTextStyle = stockLevel === 'out' ? styles.stockBadgeTextOut : stockLevel === 'low' ? styles.stockBadgeLowText : styles.stockBadgeTextIn;
            const badgeLabel = stockLevel === 'out' ? 'Out of Stock' : stockLevel === 'low' ? 'Low Stock' : 'In Stock';
            return (
              <TouchableOpacity style={styles.tile} onLongPress={() => confirmDelete(item)} accessibilityRole="button" accessibilityLabel={`${item.name}, ${badgeLabel}. Long press to remove.`} activeOpacity={0.75}>
                <View style={styles.tileIconCircle}>
                  <Text style={styles.tileIcon}>{CATEGORY_ICON[item.category] ?? '🍾'}</Text>
                </View>
                <Text style={styles.tileName} numberOfLines={2}>{item.name}</Text>
                {item.quantity ? (
                  <Text style={styles.ingredientQuantity}>{item.quantity}</Text>
                ) : null}
                <View style={[styles.stockBadge, badgeStyle]}>
                  <Text style={[styles.stockBadgeText, badgeTextStyle]}>{badgeLabel}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        />
      )}

      {/* FAB backdrop */}
      {fabOpen && <TouchableOpacity style={styles.fabBackdrop} onPress={() => setFabOpen(false)} activeOpacity={1} accessibilityLabel="Close menu" />}

      {/* FAB menu */}
      {fabOpen && (
        <View style={styles.fabMenu}>
          <TouchableOpacity style={styles.fabMenuItem} onPress={goToScan} accessibilityRole="button" accessibilityLabel="Scan ingredient label">
            <Text style={styles.fabMenuItemText}>Scan Label</Text>
            <View style={styles.fabMenuItemIcon}><Text style={styles.fabMenuItemIconText}>📷</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fabMenuItem} onPress={openModal} accessibilityRole="button" accessibilityLabel="Add ingredient manually">
            <Text style={styles.fabMenuItemText}>Add Manually</Text>
            <View style={styles.fabMenuItemIcon}><Text style={styles.fabMenuItemIconText}>✏️</Text></View>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB button */}
      <TouchableOpacity style={[styles.fab, fabOpen && styles.fabOpen]} onPress={() => setFabOpen((v) => !v)} accessibilityRole="button" accessibilityLabel={fabOpen ? 'Close add menu' : 'Add ingredient'}>
        <Text style={styles.fabIcon}>{fabOpen ? '✕' : '+'}</Text>
      </TouchableOpacity>

      {/* Add Ingredient Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Ingredient</Text>
            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.input} placeholder="e.g. Rum, Lime Juice" placeholderTextColor={Colors.textHint} value={formName} onChangeText={setFormName} autoFocus accessibilityLabel="Ingredient name" />
            <Text style={styles.label}>Category *</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat} style={[styles.categoryChip, formCategory === cat && styles.categoryChipActive]} onPress={() => setFormCategory(cat)} accessibilityRole="button" accessibilityState={{ selected: formCategory === cat }}>
                  <Text style={styles.categoryChipIcon}>{CATEGORY_ICON[cat]}</Text>
                  <Text style={[styles.categoryChipText, formCategory === cat && styles.categoryChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Quantity (optional)</Text>
            <TextInput style={styles.input} placeholder="e.g. 750" placeholderTextColor={Colors.textHint} value={formQuantity} onChangeText={setFormQuantity} keyboardType="numeric" accessibilityLabel="Quantity" />
            <Text style={styles.label}>Unit (optional)</Text>
            <TextInput style={styles.input} placeholder="e.g. ml, oz, bottle" placeholderTextColor={Colors.textHint} value={formUnit} onChangeText={setFormUnit} accessibilityLabel="Unit" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)} accessibilityRole="button">
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleAdd} disabled={submitting} accessibilityRole="button" accessibilityLabel="Confirm add ingredient">
                {submitting ? <ActivityIndicator size="small" color={Colors.background} /> : <Text style={styles.confirmText}>Add to Cabinet</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: Colors.background },
  centered:          { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  backBtn:           { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerCenter:      { flex: 1, alignItems: 'center' },
  headerRight:       { width: 36 },
  screenTitle:       { ...Typography.headingM, color: Colors.textPrimary },
  ingredientCount:   { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  goldDivider:       { height: 1, backgroundColor: Colors.accent, opacity: Opacity.goldDivider, marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  mockBanner:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: Spacing.md, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, backgroundColor: Colors.accentGlow, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.accentDim },
  mockBannerText:    { ...Typography.caption, color: Colors.accent },
  errorBanner:       { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.errorSurface, borderRadius: Radius.md },
  errorText:         { ...Typography.bodySmall, color: Colors.error },
  filterRow:         { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md },
  filterChip:        { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'transparent' },
  filterChipActive:  { backgroundColor: Colors.accentSubtle, borderColor: Colors.accent },
  filterChipText:    { ...Typography.labelSmall, color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.accent },
  grid:              { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  gridRow:           { gap: GRID_GAP, marginBottom: GRID_GAP },
  tile:              { width: TILE_SIZE, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm, alignItems: 'center', minHeight: TILE_SIZE + 20 },
  tileIconCircle:    { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surfaceRaised, borderWidth: 1, borderColor: Colors.accent, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xs },
  tileIcon:          { fontSize: 22 },
  tileName:          { ...Typography.caption, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.xs, lineHeight: 15 },
  stockBadge:        { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.pill },
  stockBadgeIn:      { backgroundColor: '#4CAF7222' },
  stockBadgeOut:     { backgroundColor: Colors.errorSurface },
  stockBadgeText:    { fontSize: 9, fontFamily: 'DMSans_500Medium', letterSpacing: 0.3 },
  stockBadgeTextIn:  { color: Colors.success },
  stockBadgeTextOut: { color: Colors.error },
  emptyState:        { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  emptyIcon:         { fontSize: 48, marginBottom: Spacing.md },
  emptyText:         { ...Typography.headingXS, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  emptySubtext:      { ...Typography.bodySmall, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  fabBackdrop:       { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 10 },
  fabMenu:           { position: 'absolute', bottom: 90, right: Spacing.lg, alignItems: 'flex-end', zIndex: 20, gap: Spacing.sm },
  fabMenuItem:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  fabMenuItemText:   { ...Typography.labelMedium, color: Colors.textPrimary, backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  fabMenuItemIcon:   { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  fabMenuItemIconText: { fontSize: 18 },
  fab:               { position: 'absolute', bottom: Spacing.xl, right: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center', zIndex: 30, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  fabOpen:           { backgroundColor: Colors.surfaceRaised, borderWidth: 1, borderColor: Colors.accent },
  fabIcon:           { fontSize: 24, color: Colors.background, lineHeight: 28 },
  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet:        { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, padding: Spacing.lg, paddingBottom: Spacing.xxl, borderTopWidth: 1, borderColor: Colors.accent + '44' },
  modalHandle:       { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: Radius.pill, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle:        { ...Typography.headingXS, color: Colors.textPrimary, marginBottom: Spacing.md },
  label:             { ...Typography.label, color: Colors.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.sm },
  input:             { backgroundColor: Colors.background, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, ...Typography.bodyMedium, borderWidth: 1, borderColor: Colors.border },
  categoryRow:       { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
  categoryChip:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  categoryChipActive: { backgroundColor: Colors.accentSubtle, borderColor: Colors.accent },
  categoryChipIcon:  { fontSize: 14 },
  categoryChipText:  { ...Typography.labelSmall, color: Colors.textMuted, textTransform: 'capitalize' },
  categoryChipTextActive: { color: Colors.accent },
  modalActions:      { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  cancelButton:      { flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText:        { ...Typography.labelMedium, color: Colors.textSecondary },
  confirmButton:     { flex: 2, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center' },
  confirmText:       { ...Typography.labelMedium, color: Colors.background },
  stockBadgeLow:     { backgroundColor: 'rgba(201,168,76,0.15)', borderWidth: 1, borderColor: '#C9A84C', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  stockBadgeLowText: { fontSize: 10, color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  ingredientQuantity:{ fontSize: 11, color: '#888888', fontFamily: 'DMSans_400Regular', marginTop: 2 },
});
