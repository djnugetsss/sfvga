import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import { useTheme } from '@/providers/ThemeProvider';
import { StarRating } from '@/components/forms/StarRating';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { RootStackParamList } from '@/navigation/RootNavigator';

// TODO: Phase 7 — submit feedback to feedback collection via Cloud Function or direct write

export default function FeedbackPromptScreen() {
  const { colors, typography, spacing } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, 'FeedbackPrompt'>>();
  const navigation = useNavigation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    // TODO: Write feedback/{id} document
    navigation.goBack();
  };

  return (
    <Modal transparent animationType="slide" visible>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, padding: spacing.lg }]}>
          <Text style={[typography.headingMedium, { color: colors.brand }]}>
            How was {route.params.eventName}?
          </Text>
          <View style={{ marginVertical: spacing.lg }}>
            <StarRating value={rating} onChange={setRating} />
          </View>
          {rating > 0 ? (
            <Input
              label="Want to tell us more? (optional)"
              multiline
              value={comment}
              onChangeText={setComment}
            />
          ) : null}
          <Button title="Submit" onPress={handleSubmit} style={{ marginTop: spacing.md }} />
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Not now"
            style={{ marginTop: spacing.sm, minHeight: 48, justifyContent: 'center' }}
          >
            <Text
              style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center' }]}
            >
              Not now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
});
