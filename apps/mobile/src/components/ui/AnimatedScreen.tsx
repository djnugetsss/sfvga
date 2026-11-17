import React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

interface AnimatedScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
}

export function AnimatedScreen({ children, style, delay = 0 }: AnimatedScreenProps) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.delay(delay).duration(180)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
