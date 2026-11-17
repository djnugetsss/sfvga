import React from 'react';
import { ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { EmptyState } from '@/components/ui/EmptyState';

// TODO: Phase 7 — implement gallery album list per event

export default function AlbumListScreen() {
  const { colors, spacing } = useTheme();
  const albums: { id: string; title: string }[] = [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {!albums.length ? <EmptyState message="No photos yet." /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
