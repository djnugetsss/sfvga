import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useTheme } from '@/providers/ThemeProvider';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';

// TODO: Phase 7 — implement photo grid with full-screen viewer, Save and Share

export default function AlbumViewScreen() {
  const { colors, spacing } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, 'AlbumView'>>();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ padding: spacing.md }}>
        <ScreenHeader title={route.params.eventName} />
        <EmptyState
          icon="images-outline"
          title="Gallery unavailable"
          message="Check the event page for its photo link."
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
