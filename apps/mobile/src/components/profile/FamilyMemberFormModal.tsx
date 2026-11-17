import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import type { FamilyMember, FamilyRelation } from '@sfvga/shared-types';
import { useTheme } from '@/providers/ThemeProvider';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import Button from '@/components/ui/Button';
import {
  validateFamilyMember,
  type FamilyMemberFormValues,
  type FamilyMemberFormErrors,
} from '@/utils/validators';

const RELATION_OPTIONS: { value: FamilyRelation; label: string }[] = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'guest', label: 'Guest' },
];

const emptyValues: FamilyMemberFormValues = {
  name: '',
  relation: 'child',
  ageYears: '',
};

interface FamilyMemberFormModalProps {
  visible: boolean;
  /** Present when editing an existing member; absent when adding. */
  member?: FamilyMember | null;
  submitting?: boolean;
  onSubmit: (values: FamilyMemberFormValues) => void;
  /** Called after the in-modal delete confirmation — parent performs the delete. */
  onDelete?: () => void;
  onClose: () => void;
}

/**
 * Bottom-sheet add/edit form for a family member. Fields: Name, Relation, optional Age (years).
 * When editing, Delete asks for confirmation in-sheet (works on web where Alert often does not).
 */
export function FamilyMemberFormModal({
  visible,
  member,
  submitting = false,
  onSubmit,
  onDelete,
  onClose,
}: FamilyMemberFormModalProps) {
  const { colors, typography, spacing, cardBorderRadius } = useTheme();
  const [values, setValues] = useState<FamilyMemberFormValues>(emptyValues);
  const [errors, setErrors] = useState<FamilyMemberFormErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEditing = !!member;

  useEffect(() => {
    if (!visible) return;
    setErrors({});
    setConfirmDelete(false);
    setValues(
      member
        ? {
            name: member.name,
            relation: member.relation,
            ageYears: member.ageYears != null ? String(member.ageYears) : '',
          }
        : emptyValues,
    );
  }, [visible, member]);

  const handleSave = () => {
    const nextErrors = validateFamilyMember(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(values);
  };

  const update = <K extends keyof FamilyMemberFormValues>(
    key: K,
    value: FamilyMemberFormValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              borderTopLeftRadius: cardBorderRadius,
              borderTopRightRadius: cardBorderRadius,
              padding: spacing.md,
            },
          ]}
        >
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {confirmDelete && isEditing && onDelete ? (
              <>
                <Text
                  style={[
                    typography.headingLarge,
                    { color: colors.textPrimary, marginBottom: spacing.sm },
                  ]}
                >
                  Delete family member?
                </Text>
                <Text
                  style={[
                    typography.bodyLarge,
                    { color: colors.textSecondary, marginBottom: spacing.lg },
                  ]}
                >
                  Remove {member?.name} from your family? This can&apos;t be undone.
                </Text>
                <Button
                  title="Delete"
                  onPress={onDelete}
                  loading={submitting}
                  style={{ backgroundColor: colors.error }}
                />
                <View style={{ marginTop: spacing.sm }}>
                  <Button
                    title="Keep"
                    variant="secondary"
                    onPress={() => setConfirmDelete(false)}
                    disabled={submitting}
                  />
                </View>
              </>
            ) : (
              <>
                <Text
                  style={[
                    typography.headingLarge,
                    { color: colors.textPrimary, marginBottom: spacing.md },
                  ]}
                >
                  {isEditing ? 'Edit Family Member' : 'Add Family Member'}
                </Text>

                <Input
                  label="Name"
                  value={values.name}
                  onChangeText={(text) => update('name', text)}
                  placeholder="Full name"
                  error={errors.name}
                  autoCapitalize="words"
                />

                <Text
                  style={[
                    typography.bodyMedium,
                    {
                      color: colors.textPrimary,
                      marginTop: spacing.md,
                      marginBottom: spacing.xs,
                    },
                  ]}
                >
                  Relation
                </Text>
                <SegmentedControl
                  options={RELATION_OPTIONS}
                  value={values.relation}
                  onChange={(value) => update('relation', value)}
                />

                <View style={{ marginTop: spacing.md }}>
                  <Input
                    label="Age (years, optional)"
                    value={values.ageYears}
                    onChangeText={(text) => update('ageYears', text.replace(/[^\d]/g, ''))}
                    placeholder="e.g. 8"
                    keyboardType="number-pad"
                    error={errors.ageYears}
                  />
                </View>

                <View style={{ marginTop: spacing.lg }}>
                  <Button
                    title={isEditing ? 'Save' : 'Add Family Member'}
                    onPress={handleSave}
                    loading={submitting}
                  />
                  <View style={{ marginTop: spacing.sm }}>
                    <Button
                      title="Cancel"
                      variant="secondary"
                      onPress={onClose}
                      disabled={submitting}
                    />
                  </View>
                  {isEditing && onDelete ? (
                    <View style={{ marginTop: spacing.md }}>
                      <Button
                        title="Delete"
                        variant="secondary"
                        onPress={() => setConfirmDelete(true)}
                        disabled={submitting}
                      />
                    </View>
                  ) : null}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '90%',
  },
});
