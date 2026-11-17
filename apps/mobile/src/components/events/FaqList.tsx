import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqListProps {
  faqs: FaqItem[];
}

/** Accordion-style FAQ list (UI/UX §5). Renders nothing when the admin has not added FAQs. */
export function FaqList({ faqs }: FaqListProps) {
  const { colors, typography, spacing, minTapTarget } = useTheme();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!faqs.length) return null;

  return (
    <View accessibilityRole="list">
      <Text
        style={[typography.headingMedium, { color: colors.textPrimary, marginBottom: spacing.sm }]}
      >
        FAQs
      </Text>
      {faqs.map((faq, index) => {
        const expanded = expandedIndex === index;
        return (
          <View key={`${faq.question}-${index}`} style={{ marginBottom: spacing.sm }}>
            <TouchableOpacity
              onPress={() => setExpandedIndex(expanded ? null : index)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={faq.question}
              accessibilityHint={expanded ? 'Collapse answer' : 'Expand answer'}
              style={[styles.questionRow, { minHeight: minTapTarget }]}
            >
              <Text
                style={[
                  typography.bodyLarge,
                  { color: colors.textPrimary, flex: 1, fontWeight: '600' },
                ]}
              >
                {faq.question}
              </Text>
              <Text
                style={[
                  typography.bodyLarge,
                  { color: colors.accentStrong, marginLeft: spacing.sm },
                ]}
              >
                {expanded ? '−' : '+'}
              </Text>
            </TouchableOpacity>
            {expanded ? (
              <Text
                style={[
                  typography.bodyMedium,
                  { color: colors.textSecondary, marginTop: spacing.xs, paddingLeft: spacing.xs },
                ]}
              >
                {faq.answer}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
