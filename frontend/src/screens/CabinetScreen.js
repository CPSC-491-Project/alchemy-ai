// =============================================================
// Alchemy AI — Ingredient Cabinet (My Cabinet)
// SCRUM-127 | feature/SCRUM-122-hifi-screens | Allisa Warren
// New screen — no placeholder to overwrite
// =============================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, Modal, TextInput,
} from 'react-native';
import { Colors, DisplayText, BodyText, Spacing, Radius } from '../theme';
import { BottomNavBar } from './HomeScreen';

const IngredientCard = ({ item, onToggle }) => (
  <View style={styles.card}>
    <View style={[styles.avatarCircle, item.inStock && styles.avatarCircleActive]}>
      <Text style={[styles.avatarLetter, item.inStock && styles.avatarLetterActive]}>
        {item.name.charAt(0)}
      </Text>
    </View>
    <Text style={styles.ingredientName}>{item.name}</Text>
    <TouchableOpacity style={[styles.stockPill, item.inStock && styles.stockPillActive]} onPress={() => onToggle(item.id)}>
      <Text style={[styles.stockPillLabel, item.inStock && styles.stockPillLabelActive]}>
        {item.inStock ? 'In Stock' : 'Add Stock'}
      </Text>
    </TouchableOpacity>
  </View>
);

const AddModal = ({ visible, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [cat, setCat] = useState('Spirit');
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Add Ingredient</Text>
          <TextInput style={styles.modalInput} placeholder="Ingredient name" placeholderTextColor={Colors.textHint} value={name} onChangeText={setName} autoFocus />
          <View style={styles.categoryRow}>
            {['Spirit', 'Mixer', 'Garnish'].map(c => (
              <TouchableOpacity key={c} style={[styles.categoryChip, cat === c && styles.categoryChipActive]} onPress={() => setCat(c)}>
                <Text style={[styles.categoryChipLabel, cat === c && styles.categoryChipLabelActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
              <Text style={styles.modalCancelLabel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalAdd, !name.trim() && styles.modalAddDisabled]}
              onPress={() => { if (name.trim()) { onAdd(name.trim(), cat); setName(''); onClose(); } }}
              disabled={!name.trim()}>
              <Text style={styles.modalAddLabel}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function CabinetScreen({ navigation }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  // TODO: wire to GET /api/cabinet on mount
  const [ingredients, setIngredients] = useState([
    { id: '1', name: 'Bourbon',  category: 'Spirit', inStock: true  },
    { id: '2', name: 'Gin',      category: 'Spirit', inStock: false },
    { id: '3', name: 'Vermouth', category: 'Mixer',  inStock: true  },
    { id: '4', name: 'Campari',  category: 'Spirit', inStock: false },
    { id: '5', name: 'Rum',      category: 'Spirit', inStock: true  },
    { id: '6', name: 'Tequila',  category: 'Spirit', inStock: false },
  ]);

  const filtered = ingredients.filter(i =>
    activeFilter === 'All' ||
    (activeFilter === 'Spirits' && i.category === 'Spirit') ||
    (activeFilter === 'Mixers' && i.category === 'Mixer') ||
    (activeFilter === 'Garnish' && i.category === 'Garnish')
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.backgroundPrimary} />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>My Cabinet</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />

      <View style={styles.filterRow}>
        {['All', 'Spirits', 'Mixers', 'Garnish'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, activeFilter === f && styles.filterChipActive]} onPress={() => setActiveFilter(f)}>
            <Text style={[styles.filterLabel, activeFilter === f && styles.filterLabelActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No ingredients here yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first</Text>
          </View>
        }
        renderItem={({ item }) => (
          <IngredientCard item={item} onToggle={id =>
            setIngredients(p => p.map(i => i.id === id ? { ...i, inStock: !i.inStock } : i))
          } />
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <AddModal visible={showModal} onClose={() => setShowModal(false)}
        onAdd={(n, c) => setIngredients(p => [...p, { id: Date.now().toString(), name: n, category: c, inStock: true }])} />

      <BottomNavBar activeTab="Favorites" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: Colors.backgroundPrimary },
  topBar:                 { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backArrow:              { color: Colors.goldPrimary, fontSize: 20 },
  screenTitle:            { ...DisplayText.navTitle, color: Colors.textPrimary },
  addIcon:                { color: Colors.goldPrimary, fontSize: 24, fontWeight: '300' },
  divider:                { height: 0.5, backgroundColor: Colors.goldPrimary, opacity: 0.4 },
  filterRow:              { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  filterChip:             { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderDefault },
  filterChipActive:       { backgroundColor: Colors.goldDark, borderColor: Colors.goldPrimary },
  filterLabel:            { ...BodyText.xSmall, color: Colors.textSecondary },
  filterLabelActive:      { color: Colors.textPrimary },
  gridContent:            { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  gridRow:                { gap: Spacing.md, marginBottom: Spacing.md },
  card:                   { flex: 1, backgroundColor: Colors.surfacePrimary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.borderDefault, alignItems: 'center', paddingVertical: Spacing.lg, paddingHorizontal: Spacing.sm, gap: Spacing.sm },
  avatarCircle:           { width: 72, height: 72, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderDefault, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSecondary },
  avatarCircleActive:     { borderColor: Colors.goldPrimary },
  avatarLetter:           { ...DisplayText.initials, color: Colors.textFaint },
  avatarLetterActive:     { color: Colors.goldPrimary },
  ingredientName:         { ...BodyText.regular, color: Colors.textPrimary, textAlign: 'center' },
  stockPill:              { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, backgroundColor: Colors.surfaceSecondary, borderWidth: 0.5, borderColor: Colors.borderDefault },
  stockPillActive:        { backgroundColor: Colors.goldDark, borderColor: Colors.goldPrimary },
  stockPillLabel:         { ...BodyText.xSmall, color: Colors.textSecondary },
  stockPillLabelActive:   { color: Colors.textPrimary },
  fab:                    { position: 'absolute', right: Spacing.lg, bottom: 90, width: 56, height: 56, borderRadius: Radius.full, backgroundColor: Colors.goldPrimary, alignItems: 'center', justifyContent: 'center' },
  fabIcon:                { color: Colors.backgroundPrimary, fontSize: 28, fontWeight: '300', lineHeight: 32 },
  emptyState:             { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, gap: Spacing.sm },
  emptyText:              { ...DisplayText.cardTitle, color: Colors.textPrimary },
  emptySubtext:           { ...BodyText.secondary, color: Colors.textSecondary },
  modalOverlay:           { flex: 1, backgroundColor: Colors.overlayDark, justifyContent: 'flex-end' },
  modalSheet:             { backgroundColor: Colors.surfaceElevated, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle:             { ...DisplayText.navTitle, color: Colors.textPrimary, marginBottom: Spacing.sm },
  modalInput:             { ...BodyText.regular, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.borderGold, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 },
  categoryRow:            { flexDirection: 'row', gap: Spacing.sm },
  categoryChip:           { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderDefault },
  categoryChipActive:     { backgroundColor: Colors.goldDark, borderColor: Colors.goldPrimary },
  categoryChipLabel:      { ...BodyText.xSmall, color: Colors.textSecondary },
  categoryChipLabelActive:{ color: Colors.textPrimary },
  modalButtons:           { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  modalCancel:            { flex: 1, paddingVertical: Spacing.sm + 2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderDefault, alignItems: 'center' },
  modalCancelLabel:       { ...BodyText.primary, color: Colors.textSecondary },
  modalAdd:               { flex: 1, paddingVertical: Spacing.sm + 2, borderRadius: Radius.md, backgroundColor: Colors.goldPrimary, alignItems: 'center' },
  modalAddDisabled:       { opacity: 0.4 },
  modalAddLabel:          { ...BodyText.primary, color: Colors.backgroundPrimary },
});
