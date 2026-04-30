// src/contexts/MixerContext.js
// SCRUM-198: Shared Mixer Space state.
//
// "Mixer Space" is a session-scoped scratchpad for ingredients the user is
// considering for a cocktail they're about to make — distinct from the
// permanent Cabinet (which is the user's owned-ingredient inventory).
//
// Items can be added from two entry points today:
//   1. CreateScreen → "Add Manually" modal → "Add to Mixer"
//   2. ScanScreen → Review state → "Add to Mixer"
//
// And rendered on the CreateScreen "Mixer Space" section.
//
// State lives in memory only — refresh clears the mixer. If we want
// persistence later, swap the useState for AsyncStorage-backed state.
// The provider API is intentionally narrow so the call sites stay simple.
//
// SCRUM-202: Mixer is capped at MIXER_MAX items. addToMixer silently
// no-ops when at cap; UIs read `isFull` to gray out their Add-to-Mixer
// buttons and surface the cap to the user before they tap.

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Exported so UI components can render "X / 8" counters without
// hard-coding the magic number alongside this module.
export const MIXER_MAX = 8;

const MIXER_STORAGE_KEY = 'alchemy_mixer_items';
const MIXER_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Module-level — no component state dependencies, always stable.
async function saveToStorage(newItems) {
  try {
    await AsyncStorage.setItem(
      MIXER_STORAGE_KEY,
      JSON.stringify({ items: newItems, savedAt: Date.now() })
    );
  } catch {}
}

const MixerContext = createContext(null);

export function MixerProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Restore persisted mixer on mount; ignore expired or corrupt data.
  useEffect(() => {
    async function restore() {
      try {
        const raw = await AsyncStorage.getItem(MIXER_STORAGE_KEY);
        if (raw) {
          const { items: stored, savedAt } = JSON.parse(raw);
          if (Date.now() - savedAt < MIXER_TTL_MS && Array.isArray(stored)) {
            setItems(stored);
          }
        }
      } catch {}
      setLoading(false);
    }
    restore();
  }, []);

  const addToMixer = useCallback((item) => {
    if (!item || !item.name) return;
    // Dedupe by case-insensitive name so repeated Add-to-Mixer presses
    // don't pile the same ingredient up multiple times. Cap check happens
    // against current items so we read the latest length, not a stale value.
    setItems((prev) => {
      if (prev.length >= MIXER_MAX) return prev; // SCRUM-202: silent no-op at cap
      const existing = prev.find(
        (i) => i.name.toLowerCase() === item.name.toLowerCase()
      );
      if (existing) return prev;
      const newItems = [
        ...prev,
        {
          id: `mix-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: item.name,
          category: item.category || null,
          quantity: item.quantity || null,
          unit: item.unit || null,
        },
      ];
      saveToStorage(newItems);
      return newItems;
    });
  }, []);

  const removeFromMixer = useCallback((id) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.id !== id);
      saveToStorage(filtered);
      return filtered;
    });
  }, []);

  const clearMixer = useCallback(() => {
    setItems([]);
    AsyncStorage.removeItem(MIXER_STORAGE_KEY);
  }, []);

  const value = {
    items,
    addToMixer,
    removeFromMixer,
    clearMixer,
    isFull: items.length >= MIXER_MAX, // SCRUM-202: UI uses this to disable add buttons
    max: MIXER_MAX,
    loading,
  };

  return <MixerContext.Provider value={value}>{children}</MixerContext.Provider>;
}

/**
 * useMixer — returns mixer state + actions.
 * Safe to call outside the provider; returns a no-op shape so components
 * don't crash if they're rendered before the provider mounts.
 */
export function useMixer() {
  const ctx = useContext(MixerContext);
  if (!ctx) {
    return {
      items: [],
      addToMixer: () => {},
      removeFromMixer: () => {},
      clearMixer: () => {},
      isFull: false,
      max: MIXER_MAX,
      loading: false,
    };
  }
  return ctx;
}
