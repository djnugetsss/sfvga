import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Alert } from 'react-native';
import type { FamilyMember } from '@sfvga/shared-types';
import { useTheme } from '@/providers/ThemeProvider';
import { useFamilyMembers } from '@/hooks/useFamilyMembers';
import { useFamilyMemberMutations } from '@/hooks/useFamilyMemberMutations';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { InlineRetryBanner } from '@/components/ui/InlineRetryBanner';
import Button from '@/components/ui/Button';
import { FamilyMemberFormModal } from '@/components/profile/FamilyMemberFormModal';
import { AppIcon } from '@/components/ui/AppIcon';
import { AnimatedScreen } from '@/components/ui/AnimatedScreen';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { toFamilyMemberInput, type FamilyMemberFormValues } from '@/utils/validators';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Family Members Screen (UI/UX §12): the member's household. Lists each member (name,
 * relation, age group) with an Edit link, plus a sticky "Add Family Member" button that opens
 * the add/edit bottom sheet. Family members are owner-writable directly in Firestore.
 */
export default function FamilyMembersScreen() {
  const { colors, typography, spacing, minTapTarget } = useTheme();
  const { data: members, isLoading, isError, refetch } = useFamilyMembers();
  const { addMember, updateMember, removeMember } = useFamilyMemberMutations();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);

  const submitting = addMember.isPending || updateMember.isPending || removeMember.isPending;

  const openAdd = () => {
    setEditing(null);
    setModalVisible(true);
  };

  const openEdit = (member: FamilyMember) => {
    setEditing(member);
    setModalVisible(true);
  };

  const closeModal = () => setModalVisible(false);

  const handleSubmit = async (values: FamilyMemberFormValues) => {
    const input = toFamilyMemberInput(values);
    try {
      if (editing) {
        await updateMember.mutateAsync({ id: editing.id, input });
      } else {
        await addMember.mutateAsync(input);
      }
      closeModal();
    } catch {
      Alert.alert('Something went wrong', "Couldn't save this family member — please try again.");
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await removeMember.mutateAsync(editing.id);
      closeModal();
    } catch {
      Alert.alert('Something went wrong', "Couldn't remove this family member — please try again.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.md, paddingBottom: spacing.lg }]}
      >
        <AnimatedScreen>{isError ? <InlineRetryBanner onRetry={refetch} /> : null}</AnimatedScreen>

        {isLoading ? (
          <>
            {[0, 1].map((item) => (
              <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: spacing.compact, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Skeleton width={42} height={42} radius={13} style={{ marginBottom: 0 }} />
                <View style={{ flex: 1, gap: 5 }}>
                  <Skeleton width="58%" height={19} radius={5} style={{ marginBottom: 0 }} />
                  <Skeleton width="37%" height={16} radius={5} style={{ marginBottom: 0 }} />
                </View>
                <Skeleton width={42} height={17} radius={5} style={{ marginBottom: 0 }} />
              </View>
            ))}
          </>
        ) : !members?.length ? (
          <EmptyState
            icon="people-outline"
            title="No family members yet"
            message="Add your household here so registering for events is faster."
          />
        ) : (
          members.map((member, index) => (
            <AnimatedScreen key={member.id} delay={Math.min(index * 55, 260)}>
              <View
                style={{
                  paddingVertical: spacing.compact,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                }}
              >
                <View style={styles.row}>
                  <View style={[styles.memberIcon, { backgroundColor: colors.brandSoft }]}>
                    <AppIcon name="person-outline" size={21} color={colors.deepBlue} />
                  </View>
                  <View style={{ flex: 1, paddingRight: spacing.md }}>
                    <Text
                      style={[typography.bodyLarge, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {member.name}
                    </Text>
                    <Text
                      style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 2 }]}
                    >
                      {capitalize(member.relation)}
                      {member.ageYears != null ? ` · Age ${member.ageYears}` : ''}
                    </Text>
                  </View>
                  <MotionPressable
                    onPress={() => openEdit(member)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${member.name}`}
                    style={{ minHeight: minTapTarget, justifyContent: 'center' }}
                    pressedScale={0.96}
                  >
                    <View style={styles.editAction}>
                      <Text
                        style={[
                          typography.bodyMedium,
                          { color: colors.deepBlue, fontWeight: '700' },
                        ]}
                      >
                        Edit
                      </Text>
                      <AppIcon name="chevron-forward" size={17} color={colors.deepBlue} />
                    </View>
                  </MotionPressable>
                </View>
              </View>
            </AnimatedScreen>
          ))
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            padding: spacing.md,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={styles.content}>
          <Button title="Add family member" icon="person-add-outline" onPress={openAdd} />
        </View>
      </View>

      <FamilyMemberFormModal
        visible={modalVisible}
        member={editing}
        submitting={submitting}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
        onClose={closeModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { width: '100%', maxWidth: 820, alignSelf: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  editAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  footer: {
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
