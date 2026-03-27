// src/services/cabinetService.js
// Alchemy AI — Cabinet Service
// Simulates backend API using AsyncStorage for local persistence.

import AsyncStorage from '@react-native-async-storage/async-storage';

const CABINET_KEY = '@alchemy_cabinet';

/**
 * Fetch all ingredients from local storage.
 * @returns {Promise<Array>} Array of ingredient objects { id, name }
 */
export async function fetchCabinet() {
  try {
    const raw = await AsyncStorage.getItem(CABINET_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('[cabinetService] fetchCabinet error:', error);
    return [];
  }
}

/**
 * Add a new ingredient to the cabinet.
 * Prevents duplicate entries (case-insensitive).
 * @param {string} name - Ingredient name
 * @returns {Promise<{ success: boolean, ingredient?: object, error?: string }>}
 */
export async function addIngredient(name) {
  try {
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: 'Ingredient name cannot be empty.' };

    const current = await fetchCabinet();

    const isDuplicate = current.some(
      (item) => item.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) return { success: false, error: `"${trimmed}" is already in your cabinet.` };

    const newIngredient = {
      id: Date.now().toString(),
      name: trimmed,
    };

    const updated = [newIngredient, ...current];
    await AsyncStorage.setItem(CABINET_KEY, JSON.stringify(updated));

    return { success: true, ingredient: newIngredient };
  } catch (error) {
    console.error('[cabinetService] addIngredient error:', error);
    return { success: false, error: 'Failed to add ingredient. Please try again.' };
  }
}

/**
 * Delete an ingredient from the cabinet by ID.
 * @param {string} id - Ingredient ID
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteIngredient(id) {
  try {
    const current = await fetchCabinet();
    const updated = current.filter((item) => item.id !== id);
    await AsyncStorage.setItem(CABINET_KEY, JSON.stringify(updated));
    return { success: true };
  } catch (error) {
    console.error('[cabinetService] deleteIngredient error:', error);
    return { success: false, error: 'Failed to delete ingredient. Please try again.' };
  }
}