import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type AppIconName = ComponentProps<typeof Ionicons>['name'];

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color: string;
}

/** Consistent outlined icon language for navigation, cards, and compact actions. */
export function AppIcon({ name, size = 20, color }: AppIconProps) {
  return <Ionicons name={name} size={size} color={color} accessibilityElementsHidden />;
}
