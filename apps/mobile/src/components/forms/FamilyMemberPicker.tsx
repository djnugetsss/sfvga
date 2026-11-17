// Checkbox-style attendee selector (UI/UX §6). The whole row is one large tap target and
// announces its selected state to screen readers; last-registration defaults are applied by
// the Registration screen that owns this picker's state.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { FamilyMember } from '@sfvga/shared-types';
import { useTheme } from '@/providers/ThemeProvider';
import { AppIcon } from '@/components/ui/AppIcon';
import { MotionPressable } from '@/components/ui/MotionPressable';

interface FamilyMemberPickerProps {
  members: FamilyMember[];
  selectedIds: string[];
  onToggle: (memberId: string) => void;
  includeSelf?: boolean;
  selfName?: string;
  selfSelected?: boolean;
  onToggleSelf?: () => void;
}

export function FamilyMemberPicker({
  members,
  selectedIds,
  onToggle,
  includeSelf = true,
  selfName = 'You',
  selfSelected = true,
  onToggleSelf,
}: FamilyMemberPickerProps) {
  const { colors, typography, spacing, minTapTarget } = useTheme();

  return (
    <View>
      {includeSelf ? (
        <MotionPressable
          onPress={onToggleSelf}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selfSelected }}
          accessibilityLabel={`${selfName}, Adult, ${selfSelected ? 'selected' : 'not selected'}`}
          style={[
            styles.row,
            {
              minHeight: minTapTarget,
              marginBottom: spacing.sm,
              borderColor: selfSelected ? colors.brand : colors.border,
              backgroundColor: selfSelected ? colors.brandSoft : colors.cardBackground,
            },
          ]}
          pressedScale={0.985}
        >
          <View
            style={[
              styles.check,
              {
                backgroundColor: selfSelected ? colors.brand : 'transparent',
                borderColor: selfSelected ? colors.brand : colors.border,
              },
            ]}
          >
            {selfSelected ? <AppIcon name="checkmark" size={16} color="#FFFFFF" /> : null}
          </View>
          <View style={styles.copy}>
            <Text style={[typography.bodyLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
              {selfName}
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Member</Text>
          </View>
        </MotionPressable>
      ) : null}
      {members.map((member) => {
        const selected = selectedIds.includes(member.id);
        return (
          <MotionPressable
            key={member.id}
            onPress={() => onToggle(member.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${member.name}, ${member.ageGroup}, ${selected ? 'selected' : 'not selected'}`}
            style={[
              styles.row,
              {
                minHeight: minTapTarget,
                marginBottom: spacing.sm,
                borderColor: selected ? colors.brand : colors.border,
                backgroundColor: selected ? colors.brandSoft : colors.cardBackground,
              },
            ]}
            pressedScale={0.985}
          >
            <View
              style={[
                styles.check,
                {
                  backgroundColor: selected ? colors.brand : 'transparent',
                  borderColor: selected ? colors.brand : colors.border,
                },
              ]}
            >
              {selected ? <AppIcon name="checkmark" size={16} color="#FFFFFF" /> : null}
            </View>
            <View style={styles.copy}>
              <Text
                style={[typography.bodyLarge, { color: colors.textPrimary, fontWeight: '700' }]}
              >
                {member.name}
              </Text>
              <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
                {member.ageGroup}
              </Text>
            </View>
          </MotionPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  copy: { flex: 1, gap: 2 },
});
