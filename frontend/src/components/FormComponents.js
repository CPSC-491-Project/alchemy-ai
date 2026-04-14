// =============================================================
// Alchemy AI — Form Inputs & Button Components
// SCRUM-108 | feature/SCRUM-108-form-inputs-buttons | Allisa Warren
// =============================================================
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BodyText, Spacing, Radius } from '../theme';

export const AlchemyInput = ({
  label, placeholder, value, onChangeText,
  secureTextEntry = false, error, disabled = false,
  autoCapitalize = 'none', keyboardType = 'default',
  returnKeyType = 'done', onSubmitEditing, style,
}) => {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? '#B00020' : focused ? Colors.goldPrimary : Colors.borderDefault;
  return (
    <View style={[styles.inputWrapper, style]}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <View style={[styles.inputContainer, { borderColor }, disabled && styles.inputDisabled]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textHint}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          editable={!disabled}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={Colors.goldPrimary}
        />
      </View>
      {error ? <Text style={styles.inputError}>{error}</Text> : null}
    </View>
  );
};

export const PrimaryButton = ({ label, onPress, disabled = false, loading = false, style }) => {
  if (disabled || loading) {
    return (
      <TouchableOpacity style={[styles.buttonBase, styles.buttonDisabled, style]} disabled activeOpacity={1}>
        {loading
          ? <ActivityIndicator size="small" color={Colors.textFaint} />
          : <Text style={[styles.buttonLabel, styles.buttonLabelDisabled]}>{label}</Text>}
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.buttonBase, style]}>
      <LinearGradient colors={[Colors.goldPrimary, Colors.goldDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientFill}>
        <Text style={styles.buttonLabel}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export const SecondaryButton = ({ label, onPress, disabled = false, style }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} disabled={disabled}
    style={[styles.buttonBase, styles.secondaryButton, disabled && styles.buttonDisabled, style]}>
    <Text style={[styles.secondaryLabel, disabled && styles.buttonLabelDisabled]}>{label}</Text>
  </TouchableOpacity>
);

export const PillButton = ({ label, selected = false, onPress, style }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.pill, selected && styles.pillSelected, style]}>
    <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>{label}</Text>
  </TouchableOpacity>
);

export const TextButton = ({ label, onPress, style }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={style}>
    <Text style={styles.textButtonLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  inputWrapper:        { marginBottom: Spacing.md },
  inputLabel:          { ...BodyText.small, color: Colors.textSecondary, marginBottom: Spacing.xs, letterSpacing: 0.5 },
  inputContainer:      { backgroundColor: Colors.surfacePrimary, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 },
  input:               { ...BodyText.regular, color: Colors.textPrimary, padding: 0, margin: 0 },
  inputDisabled:       { opacity: 0.4 },
  inputError:          { ...BodyText.xSmall, color: '#B00020', marginTop: Spacing.xs },
  buttonBase:          { borderRadius: Radius.md, overflow: 'hidden', height: 48, justifyContent: 'center', alignItems: 'center' },
  buttonDisabled:      { backgroundColor: Colors.surfaceSecondary, opacity: 0.5 },
  buttonLabel:         { ...BodyText.labelButtonS, color: Colors.backgroundPrimary, letterSpacing: 0.5 },
  buttonLabelDisabled: { color: Colors.textFaint },
  gradientFill:        { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg },
  secondaryButton:     { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.goldPrimary, paddingHorizontal: Spacing.lg },
  secondaryLabel:      { ...BodyText.labelButtonS, color: Colors.goldPrimary, letterSpacing: 0.5 },
  pill:                { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderDefault, backgroundColor: 'transparent' },
  pillSelected:        { borderColor: Colors.goldPrimary, backgroundColor: Colors.surfacePrimary },
  pillLabel:           { ...BodyText.small, color: Colors.textSecondary },
  pillLabelSelected:   { color: Colors.goldPrimary },
  textButtonLabel:     { ...BodyText.regular, color: Colors.goldPrimary, textDecorationLine: 'underline' },
});
