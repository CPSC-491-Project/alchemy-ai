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

import React, { createContext, useContext, useState, useCallback } from 'react';

const MixerContext = createContext(null);

export function MixerProvider({ children }) {
  const [items, setItems] = useState([]);

  const addToMixer = useCallback((item) => {
    if (!item || !item.name) return;
    // Dedupe by case-insensitive name so repeated Add-to-Mixer presses
    // don't pile the same ingredient up multiple times.
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.name.toLowerCase() === item.name.toLowerCase()
      );
      if (existing) return prev;
      return [
        ...prev,
        {
          id: `mix-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: item.name,
          category: item.category || null,
          quantity: item.quantity || null,
          unit: item.unit || null,
        },
      ];
    });
  }, []);

  const removeFromMixer = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearMixer = useCallback(() => {
    setItems([]);
  }, []);

  const value = { items, addToMixer, removeFromMixer, clearMixer };

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
    };
  }
  return ctx;
}
