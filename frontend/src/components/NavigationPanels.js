// =============================================================
// Alchemy AI — Left + Right Navigation Panels
// SCRUM-106 | feature/SCRUM-122-hifi-screens | Allisa Warren
// =============================================================
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { Colors, BodyText, Spacing, Radius } from '../theme';

const { width: W } = Dimensions.get('window');

const LEFT_ITEMS = [
  { label: 'Home',       screen: 'Home'      },
  { label: 'Search',     screen: 'Search'    },
  { label: 'My Cabinet', screen: 'Cabinet'   },
  { label: 'Party Mode', screen: 'PartyMode' },
  { label: 'Favorites',  screen: 'Favorites' },
  { label: 'Profile',    screen: 'Profile'   },
];

export const LeftPanel = ({ visible, activeScreen, onClose, onNavigate, onSignOut }) => {
  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.overlay} /></TouchableWithoutFeedback>
      <View style={styles.leftPanel}>
        <View style={styles.panelLogo}>
          <Text style={styles.panelLogoText}>ALCHEMY</Text>
          <View style={styles.panelLogoDivider} />
          <Text style={styles.panelLogoSub}>AI</Text>
        </View>
        <View style={styles.navItems}>
          {LEFT_ITEMS.map(item => {
            const active = activeScreen === item.screen;
            return (
              <TouchableOpacity key={item.screen} style={[styles.navItem, active && styles.navItemActive]}
                onPress={() => { onNavigate(item.screen); onClose(); }} activeOpacity={0.7}>
                <Text style={[styles.navItemLabel, active && styles.navItemLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.signOutRow}>
          <TouchableOpacity onPress={onSignOut}><Text style={styles.signOutLabel}>Sign Out</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export const RightPanel = ({ visible, onClose, selectedSort, onSortChange, onFilterPress }) => {
  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.overlay} /></TouchableWithoutFeedback>
      <View style={styles.rightPanel}>
        <View style={styles.rightSection}>
          <Text style={styles.rightSectionHeader}>FILTER</Text>
          {['Spirit', 'Style', 'Difficulty'].map(opt => (
            <TouchableOpacity key={opt} style={styles.rightRow} onPress={() => onFilterPress(opt)}>
              <Text style={styles.rightRowLabel}>{opt}</Text>
              <View style={styles.rightRowDivider} />
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.rightSection}>
          <Text style={styles.rightSectionHeader}>SORT</Text>
          {['Popular', 'Recent', 'Name'].map(opt => {
            const sel = selectedSort === opt;
            return (
              <TouchableOpacity key={opt} style={styles.sortRow} onPress={() => onSortChange(opt)}>
                <View style={[styles.radioOuter, sel && styles.radioOuterActive]}>
                  {sel && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.sortLabel, sel && styles.sortLabelActive]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay:              { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlayDark },
  leftPanel:            { position: 'absolute', left: 0, top: 0, bottom: 0, width: W * 0.67, backgroundColor: Colors.surfaceElevated, borderRightWidth: 0.5, borderRightColor: Colors.borderDefault },
  panelLogo:            { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md },
  panelLogoText:        { fontFamily: 'CormorantGaramond_300Light', fontSize: 28, color: Colors.goldLight, letterSpacing: 8 },
  panelLogoDivider:     { height: 0.5, backgroundColor: Colors.goldPrimary, opacity: 0.5, marginVertical: Spacing.xs, width: 180 },
  panelLogoSub:         { fontFamily: 'CormorantGaramond_300Light', fontSize: 11, color: Colors.textFaint, letterSpacing: 6 },
  navItems:             { flex: 1, marginTop: Spacing.sm },
  navItem:              { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md + 2, borderBottomWidth: 0.5, borderBottomColor: Colors.borderDefault },
  navItemActive:        { backgroundColor: Colors.surfacePrimary },
  navItemLabel:         { ...BodyText.regular, color: Colors.textSecondary, letterSpacing: 0.5 },
  navItemLabelActive:   { color: Colors.goldPrimary },
  signOutRow:           { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, backgroundColor: Colors.surfaceDark, borderTopWidth: 0.5, borderTopColor: Colors.borderDefault },
  signOutLabel:         { ...BodyText.regular, color: Colors.textFaint },
  rightPanel:           { position: 'absolute', right: 0, top: 0, bottom: 0, width: W * 0.45, backgroundColor: Colors.surfaceElevated, borderLeftWidth: 0.5, borderLeftColor: Colors.borderDefault, paddingTop: 80, paddingHorizontal: Spacing.lg },
  rightSection:         { marginBottom: Spacing.xl },
  rightSectionHeader:   { ...BodyText.tiny, color: Colors.textFaint, letterSpacing: 4, marginBottom: Spacing.md },
  rightRow:             { paddingVertical: Spacing.sm + 2 },
  rightRowLabel:        { ...BodyText.regular, color: Colors.textPrimary, letterSpacing: 0.5, marginBottom: Spacing.sm },
  rightRowDivider:      { height: 0.5, backgroundColor: Colors.borderDefault },
  sortRow:              { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  radioOuter:           { width: 16, height: 16, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.textFaint, alignItems: 'center', justifyContent: 'center' },
  radioOuterActive:     { borderColor: Colors.goldPrimary },
  radioInner:           { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.goldPrimary },
  sortLabel:            { ...BodyText.regular, color: Colors.textSecondary },
  sortLabelActive:      { color: Colors.goldPrimary },
});
