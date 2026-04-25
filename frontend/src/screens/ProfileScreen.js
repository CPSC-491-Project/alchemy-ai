import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, Switch, SafeAreaView, Pressable, ActivityIndicator,
} from 'react-native';
import { useFonts, CormorantGaramond_300Light } from '@expo-google-fonts/cormorant-garamond';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { updateUserPreferences } from '../services/userService';

const BG        = '#0D0D0D';
const GOLD      = '#C9A84C';
const CARD      = 'rgba(255,255,255,0.04)';
const BORDER    = 'rgba(255,255,255,0.08)';
const TEXT_PRI  = '#FFFFFF';
const TEXT_SEC  = 'rgba(255,255,255,0.45)';
const GOLD_BG   = 'rgba(201,168,76,0.15)';

const FLAVOR_TAGS = ['Citrus', 'Bitter', 'Smoke', 'Sweet', 'Sour', 'Spicy', 'Herbal', 'Floral'];

function BottomModal({ visible, onClose, title, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const [fontsLoaded] = useFonts({ CormorantGaramond_300Light, DMSans_400Regular });

  const [openModal, setOpenModal]     = useState(null);
  const [savedFlavors, setSavedFlavors] = useState([]);   // ← persists between opens
  const [flavorDraft, setFlavorDraft] = useState([]);     // ← working copy while modal is open
  const [unit, setUnit]               = useState('oz');
  const [isPublic, setIsPublic]       = useState(true);
  const [saving, setSaving]           = useState(false);

  const getToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Guest';
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const isPremium = user?.isPremium ?? false;

  // Seed draft from saved flavors when opening
  const openFlavor  = () => { setFlavorDraft([...savedFlavors]); setOpenModal('flavor'); };
  const openUnits   = () => setOpenModal('units');
  const openPrivacy = () => setOpenModal('privacy');
  const openBilling = () => setOpenModal('billing');
  const closeModal  = () => setOpenModal(null);

  const savePreferences = async (patch) => {
    setSaving(true);
    try {
      const token = await getToken();
      if (token) await updateUserPreferences(token, patch);
    } catch (e) {
      console.warn('updateUserPreferences failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const saveFlavor = async () => {
    setSavedFlavors([...flavorDraft]);           // ← persist locally
    await savePreferences({ flavorTags: flavorDraft });
    closeModal();
  };

  const saveUnits   = async (v) => { setUnit(v); await savePreferences({ unit: v }); };
  const savePrivacy = async (v) => { setIsPublic(v); await savePreferences({ publicProfile: v }); };

  const toggleTag = (tag) => setFlavorDraft(prev =>
    prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
  );

  // Display string for flavor row — shows saved tags or fallback
  const flavorDisplay = savedFlavors.length > 0
    ? savedFlavors.slice(0, 3).join(', ') + (savedFlavors.length > 3 ? '…' : '')
    : 'Not set';

  if (!fontsLoaded) return null;

  const Row = ({ label, value, onPress, isLast }) => (
    <TouchableOpacity
      style={[styles.row, isLast && styles.rowLast]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color={TEXT_SEC} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.header}>Profile</Text>

        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <View style={[styles.badge, isPremium && styles.badgePremium]}>
            <Text style={[styles.badgeText, isPremium && styles.badgeTextPremium]}>
              {isPremium ? 'PREMIUM' : 'FREE'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.card}>
          <Row label="Flavor Preferences"     value={flavorDisplay}                   onPress={openFlavor}  />
          <Row label="Units & Measurements"   value={unit === 'oz' ? 'oz' : 'ml'}     onPress={openUnits}   />
          <Row label="Notifications"          onPress={() => {}}                       />
          <Row label="Privacy"                value={isPublic ? 'Public' : 'Private'} onPress={openPrivacy} />
          <Row label="Subscription & Billing" onPress={openBilling}                   isLast />
        </View>

        <Text style={styles.version}>App Version 1.0.0</Text>
      </ScrollView>

      <BottomModal visible={openModal === 'flavor'} onClose={closeModal} title="Flavor Preferences">
        <Text style={styles.sheetSub}>Select the flavors you enjoy most</Text>
        <View style={styles.tagGrid}>
          {FLAVOR_TAGS.map(tag => {
            const active = flavorDraft.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tag, active && styles.tagActive]}
                onPress={() => toggleTag(tag)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={saveFlavor} disabled={saving}>
          {saving ? <ActivityIndicator color={BG} /> : <Text style={styles.saveBtnText}>Save Preferences</Text>}
        </TouchableOpacity>
      </BottomModal>

      <BottomModal visible={openModal === 'units'} onClose={closeModal} title="Units & Measurements">
        <Text style={styles.sheetSub}>Choose your preferred measurement system</Text>
        {['oz', 'ml'].map(option => {
          const active = unit === option;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.optionRow, active && styles.optionRowActive]}
              onPress={() => { saveUnits(option); closeModal(); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {option === 'oz' ? 'Ounces (oz)' : 'Millilitres (ml)'}
              </Text>
              {active && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
            </TouchableOpacity>
          );
        })}
      </BottomModal>

      <BottomModal visible={openModal === 'privacy'} onClose={closeModal} title="Privacy">
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Public Profile</Text>
            <Text style={styles.toggleSub}>
              {isPublic ? 'Your profile is visible to the community' : 'Your profile is hidden from other users'}
            </Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={savePrivacy}
            trackColor={{ false: BORDER, true: GOLD }}
            thumbColor={TEXT_PRI}
          />
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={closeModal}>
          <Text style={styles.saveBtnText}>Done</Text>
        </TouchableOpacity>
      </BottomModal>

      <BottomModal visible={openModal === 'billing'} onClose={closeModal} title="Subscription & Billing">
        <View style={[styles.planCard, isPremium && styles.planCardPremium]}>
          <Text style={styles.planName}>{isPremium ? '✦ Premium' : 'Free Plan'}</Text>
          <Text style={styles.planDesc}>
            {isPremium
              ? 'You have full access to all Alchemy AI features including Party Mode, advanced AI recommendations, and priority support.'
              : 'Upgrade to Premium to unlock Party Mode, unlimited scans, and advanced AI cocktail recommendations.'}
          </Text>
        </View>
        {!isPremium && (
          <TouchableOpacity style={styles.saveBtn} onPress={closeModal}>
            <Text style={styles.saveBtnText}>Upgrade to Premium</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.ghostBtn} onPress={closeModal}>
          <Text style={styles.ghostBtnText}>{isPremium ? 'Close' : 'Maybe Later'}</Text>
        </TouchableOpacity>
      </BottomModal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: BG },
  scroll:           { paddingHorizontal: 20, paddingBottom: 40 },
  header:           { fontFamily: 'CormorantGaramond_300Light', fontSize: 32, color: TEXT_PRI, marginTop: 16, marginBottom: 24 },
  avatarCard:       { alignItems: 'center', backgroundColor: CARD, borderRadius: 20, padding: 28, marginBottom: 28, borderWidth: 1, borderColor: BORDER },
  avatar:           { width: 64, height: 64, borderRadius: 32, backgroundColor: GOLD_BG, borderWidth: 1.5, borderColor: GOLD, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText:       { fontFamily: 'CormorantGaramond_300Light', fontSize: 22, color: GOLD },
  name:             { fontFamily: 'CormorantGaramond_300Light', fontSize: 22, color: TEXT_PRI, marginBottom: 8 },
  badge:            { paddingHorizontal: 12, paddingVertical: 3, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: BORDER },
  badgePremium:     { backgroundColor: GOLD_BG, borderColor: GOLD },
  badgeText:        { fontFamily: 'DMSans_400Regular', fontSize: 10, color: TEXT_SEC, letterSpacing: 1.5 },
  badgeTextPremium: { color: GOLD },
  sectionLabel:     { fontFamily: 'DMSans_400Regular', fontSize: 11, color: TEXT_SEC, letterSpacing: 2, marginBottom: 10 },
  card:             { backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, marginBottom: 28, overflow: 'hidden' },
  row:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  rowLast:          { borderBottomWidth: 0 },
  rowLabel:         { fontFamily: 'DMSans_400Regular', fontSize: 15, color: TEXT_PRI },
  rowRight:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue:         { fontFamily: 'DMSans_400Regular', fontSize: 13, color: TEXT_SEC },
  version:          { fontFamily: 'DMSans_400Regular', fontSize: 12, color: TEXT_SEC, textAlign: 'center' },
  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:            { backgroundColor: '#141414', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingBottom: 36, paddingTop: 12, borderWidth: 1, borderColor: BORDER },
  handle:           { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20 },
  sheetTitle:       { fontFamily: 'CormorantGaramond_300Light', fontSize: 24, color: TEXT_PRI, marginBottom: 6 },
  sheetSub:         { fontFamily: 'DMSans_400Regular', fontSize: 13, color: TEXT_SEC, marginBottom: 22 },
  tagGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  tag:              { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  tagActive:        { backgroundColor: GOLD_BG, borderColor: GOLD },
  tagText:          { fontFamily: 'DMSans_400Regular', fontSize: 14, color: TEXT_SEC },
  tagTextActive:    { color: GOLD },
  optionRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 10 },
  optionRowActive:  { borderColor: GOLD, backgroundColor: GOLD_BG },
  optionText:       { fontFamily: 'DMSans_400Regular', fontSize: 16, color: TEXT_SEC },
  optionTextActive: { color: GOLD },
  toggleRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 24 },
  toggleLabel:      { fontFamily: 'DMSans_400Regular', fontSize: 15, color: TEXT_PRI, marginBottom: 4 },
  toggleSub:        { fontFamily: 'DMSans_400Regular', fontSize: 12, color: TEXT_SEC, maxWidth: 220 },
  planCard:         { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 22 },
  planCardPremium:  { borderColor: GOLD, backgroundColor: GOLD_BG },
  planName:         { fontFamily: 'CormorantGaramond_300Light', fontSize: 22, color: TEXT_PRI, marginBottom: 8 },
  planDesc:         { fontFamily: 'DMSans_400Regular', fontSize: 13, color: TEXT_SEC, lineHeight: 20 },
  saveBtn:          { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnText:      { fontFamily: 'DMSans_400Regular', fontSize: 15, color: BG, fontWeight: '600', letterSpacing: 0.5 },
  ghostBtn:         { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  ghostBtnText:     { fontFamily: 'DMSans_400Regular', fontSize: 14, color: TEXT_SEC },
});
