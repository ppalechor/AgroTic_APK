import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

export default function Button({ title, onPress, variant = 'primary', disabled }) {
  const style = [styles.base, variant === 'primary' ? styles.primary : styles.secondary, disabled && styles.disabled];
  const textStyle = [styles.text, variant === 'primary' ? styles.textPrimary : styles.textSecondary];
  return (
    <Pressable style={style} onPress={onPress} disabled={disabled}>
      <Text style={textStyle}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 14,
  },
  secondary: {
    borderWidth: 1,
    borderColor: '#D0D5DD',
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  textPrimary: {
    color: '#fff',
  },
  textSecondary: {
    color: '#16A34A',
  },
  disabled: {
    opacity: 0.6,
  },
});