// src/screens/CabinetScreen.js
// Alchemy AI — Ingredient Cabinet Screen
// Sprint 2: Wired to AsyncStorage via cabinetService. Will connect to user profile in Sprint 3.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { fetchCabinet, addIngredient, deleteIngredient } from '../services/cabinetService';

export default function CabinetScreen({ navigation }) {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [saving, setSaving] = useState(false);

  // ─── Load ingredients on mount ───────────────────────────────────────────────

  const loadCabinet = useCallback(async () => {
    setLoading(true);
    const data = await fetchCabinet();
    setIngredients(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCabinet();
  }, [loadCabinet]);

  // ─── Add ingredient ───────────────────────────────────────────────────────────

  const handleAdd = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    setSaving(true);
    const result = await addIngredient(trimmed);
    setSaving(false);

    if (result.success) {
      setIngredients((prev) => [result.ingredient, ...prev]);
      setInputText('');
      setModalVisible(false);
    } else {
      Alert.alert('Could not add ingredient', result.error);
    }
  };

  // ─── Delete ingredient ────────────────────────────────────────────────────────

  const handleDelete = async (id) => {
    // Optimistic update: remove from UI immediately
    setIngredients((prev) => prev.filter((item) => item.id !== id));

    const result = await deleteIngredient(id);
    if (!result.success) {
      // Rollback on failure
      Alert.alert('Error', result.error);
      loadCabinet();
    }
  };

  // ─── Render helpers ───────────────────────────────────────────────────────────

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.bullet} />
        <Text style={styles.ingredientName}>{item.name}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.deleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ingredient Cabinet</Text>
      </View>

      <Text style={styles.subtitle}>
        {ingredients.length} {ingredients.length === 1 ? 'ingredient' : 'ingredients'} stocked
      </Text>

      {/* Ingredient List */}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color="#C9A84C" />
          <Text style={styles.loadingText}>Loading cabinet...</Text>
        </View>
      ) : (
        <FlatList
          data={ingredients}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🍶</Text>
              <Text style={styles.emptyText}>Your cabinet is empty.</Text>
              <Text style={styles.emptySubText}>
                Add ingredients to get personalized cocktail recommendations.
              </Text>
            </View>
          }
        />
      )}

      {/* Add Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.addButtonText}>+ Add Ingredient</Text>
        </TouchableOpacity>
      </View>

      {/* Add Ingredient Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Ingredient</Text>
            <Text style={styles.modalSubtitle}>What's in your cabinet?</Text>

            <TextInput
              style={styles.textInput}
              placeholder="e.g. Campari, Lime Juice, Gin..."
              placeholderTextColor="#4A4A4A"
              value={inputText}
              onChangeText={setInputText}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAdd}
              selectionColor="#C9A84C"
              editable={!saving}
            />

            <TouchableOpacity
              style={[
                styles.modalAddButton,
                (!inputText.trim() || saving) && styles.modalAddButtonDisabled,
              ]}
              onPress={handleAdd}
              activeOpacity={0.85}
              disabled={!inputText.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#0A0A0A" />
              ) : (
                <Text style={styles.modalAddButtonText}>Add to Cabinet</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setInputText('');
                setModalVisible(false);
              }}
              disabled={saving}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  backArrow: {
    color: '#C9A84C',
    fontSize: 22,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#F5F0E8',
  },
  subtitle: {
    color: '#8A8A8A',
    fontSize: 13,
    paddingHorizontal: 20,
    marginBottom: 16,
  },

  // Loading
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#8A8A8A',
    fontSize: 14,
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C9A84C',
    marginRight: 12,
  },
  ingredientName: {
    color: '#F5F0E8',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 12,
  },
  deleteText: {
    color: '#8A8A8A',
    fontSize: 14,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  emptyText: {
    color: '#F5F0E8',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    color: '#8A8A8A',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1C1C1C',
  },
  addButton: {
    backgroundColor: '#C9A84C',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalSheet: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A2A2A',
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#F5F0E8',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#8A8A8A',
    fontSize: 13,
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    color: '#F5F0E8',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  modalAddButton: {
    backgroundColor: '#C9A84C',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalAddButtonDisabled: {
    opacity: 0.4,
  },
  modalAddButtonText: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: '700',
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#8A8A8A',
    fontSize: 14,
  },
});