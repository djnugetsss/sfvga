import React from 'react';
import { Modal, View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import Button from '@/components/ui/Button';

interface ExternalLinkConfirmModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Redirect notice before leaving the app for an external URL (Google Photos, OneDrive, etc.).
 * Uses a Modal instead of Alert so it works reliably on Expo web as well as native.
 */
export function ExternalLinkConfirmModal({
  visible,
  title = 'Leave the app?',
  message = 'You’ll open this link in your browser (or the Photos / OneDrive app if installed).',
  confirmLabel = 'Open link',
  onCancel,
  onConfirm,
}: ExternalLinkConfirmModalProps) {
  const { colors, typography, spacing, textAccessibilityProps } = useTheme();

  if (!visible && Platform.OS === 'web') {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.backdrop, { backgroundColor: 'rgba(15, 23, 42, 0.55)' }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.background,
              padding: spacing.lg,
              marginHorizontal: spacing.lg,
            },
          ]}
        >
          <Text
            style={[typography.headingLarge, { color: colors.textPrimary }]}
            {...textAccessibilityProps}
          >
            {title}
          </Text>
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.lg },
            ]}
            {...textAccessibilityProps}
          >
            {message}
          </Text>
          <Button title={confirmLabel} onPress={onConfirm} />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={onCancel}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
});
