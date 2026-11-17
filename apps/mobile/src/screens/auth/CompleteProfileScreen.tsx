import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { completeMemberProfile } from '@/services/authService';
import { getErrorMessage } from '@/utils/errors';
import { AuthShell } from '@/components/auth/AuthShell';

const legalSite = 'https://sfvga-cabe6.web.app';

/** Required one-time setup after Firebase has verified a new member's phone number. */
export default function CompleteProfileScreen() {
  const { colors, typography, spacing } = useTheme();
  const { firebaseUser, signOut } = useAuthContext();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstNameError, setFirstNameError] = useState<string>();
  const [lastNameError, setLastNameError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [agreementError, setAgreementError] = useState(false);

  const handleContinue = async () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    setFirstNameError(trimmedFirstName ? undefined : 'Enter your first name');
    setLastNameError(trimmedLastName ? undefined : 'Enter your last name');
    setSubmitError(undefined);
    setAgreementError(!agreed);

    if (!trimmedFirstName || !trimmedLastName || !agreed || !firebaseUser) return;

    setSaving(true);
    try {
      await completeMemberProfile(firebaseUser, trimmedFirstName, trimmedLastName, agreed);
      // The profile listener updates automatically and RootNavigator opens the member app.
    } catch (error) {
      setSubmitError(getErrorMessage(error, "We couldn't save your name — please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Phone verified"
      title="What should we call you?"
      subtitle="Add your name to finish setting up your account."
    >
      <View>
        <Input
          label="First name"
          autoComplete="given-name"
          textContentType="givenName"
          value={firstName}
          onChangeText={(value) => {
            setFirstName(value);
            if (firstNameError) setFirstNameError(undefined);
          }}
          error={firstNameError}
          editable={!saving}
        />
        <View style={{ marginTop: spacing.md }}>
          <Input
            label="Last name"
            autoComplete="family-name"
            textContentType="familyName"
            value={lastName}
            onChangeText={(value) => {
              setLastName(value);
              if (lastNameError) setLastNameError(undefined);
            }}
            error={lastNameError}
            editable={!saving}
          />
        </View>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="I agree to the Terms of Use and Privacy Notice"
          accessibilityState={{ checked: agreed }}
          disabled={saving}
          onPress={() => {
            setAgreed((value) => !value);
            setAgreementError(false);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: spacing.md }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: agreementError ? colors.error : colors.brand,
              backgroundColor: agreed ? colors.brand : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {agreed ? (
              <Text style={{ color: colors.onPrimary, fontSize: 19, fontWeight: '700' }}>✓</Text>
            ) : null}
          </View>
          <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>
            I agree to the Terms of Use and Privacy Notice.
          </Text>
        </Pressable>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.md,
            marginLeft: 44,
            marginTop: spacing.xs,
          }}
        >
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(`${legalSite}/terms.html`)}
            style={{ minHeight: 48, justifyContent: 'center' }}
          >
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.brand, textDecorationLine: 'underline' },
              ]}
            >
              Read Terms of Use
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(`${legalSite}/privacy.html`)}
            style={{ minHeight: 48, justifyContent: 'center' }}
          >
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.brand, textDecorationLine: 'underline' },
              ]}
            >
              Read Privacy Notice
            </Text>
          </Pressable>
        </View>
        {agreementError ? (
          <Text accessibilityRole="alert" style={[typography.bodyMedium, { color: colors.error }]}>
            Please agree before finishing account setup.
          </Text>
        ) : null}
      </View>

      {submitError ? (
        <Text
          accessibilityRole="alert"
          style={[typography.bodyMedium, { color: colors.error, marginTop: spacing.md }]}
        >
          {submitError}
        </Text>
      ) : null}

      <View style={{ marginTop: spacing.lg }}>
        <Button
          title="Finish account setup"
          icon="checkmark-circle-outline"
          onPress={() => void handleContinue()}
          loading={saving}
        />
      </View>
      <View style={{ marginTop: spacing.sm }}>
        <Button
          title="Use a different phone number"
          variant="secondary"
          onPress={() => void signOut()}
          disabled={saving}
        />
      </View>
    </AuthShell>
  );
}
