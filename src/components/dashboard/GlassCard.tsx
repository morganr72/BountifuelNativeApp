/**
 * src/components/dashboard/GlassCard.tsx
 *
 * A reusable card component with a "glassmorphism" effect.
 */
import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { COLORS } from '../../constants/colors';

type GlassCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const GlassCard: React.FC<GlassCardProps> = ({ children, style }) => {
  return <View style={[styles.glassCard, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  glassCard: {
    backgroundColor: COLORS.glass,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    width: '48%',
  },
});
