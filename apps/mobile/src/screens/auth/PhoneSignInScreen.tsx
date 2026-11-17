import React, { useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import {
  RecaptchaVerifierModal,
  type RecaptchaVerifierHandle,
} from '@/components/auth/RecaptchaVerifierModal';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { getPhoneAuthErrorMessage } from '@/utils/errors';
import type { AuthStackParamList } from '@/navigation/AuthStack';
import { AuthShell } from '@/components/auth/AuthShell';
import { getFirebaseAuth, paymentTestMode } from '@/services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

/**
 * Phone Sign-In (UI spec §1). Enter phone → reCAPTCHA → SMS OTP sent → OTP screen.
 * Uses Firebase Auth `signInWithPhoneNumber` via authService.
 */
export default function PhoneSignInScreen() {
  const { colors, typography, spacing } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { sendPhoneOtp, isValidUsPhone, toE164UsPhone } = useAuth();

  const recaptchaRef = useRef<RecaptchaVerifierHandle>(null);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleContinue = async () => {
    setError(undefined);

    if (!isValidUsPhone(phone)) {
      setError("That doesn't look like a valid phone number");
      return;
    }
    if (!recaptchaRef.current) {
      setError("We couldn't start verification — please try again");
      return;
    }

    setLoading(true);
    try {
      const e164 = toE164UsPhone(phone);
      await sendPhoneOtp(e164, recaptchaRef.current);
      navigation.navigate('OtpVerify', { phoneNumber: phone, e164 });
    } catch (err) {
      console.error('Phone OTP send failed', err);
      setError(getPhoneAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthShell title="Welcome to SFVGA" subtitle="Enter your phone number to sign in.">
        <Input
          label="Phone number"
          placeholder="(818) 555-0123"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          value={phone}
          onChangeText={setPhone}
          error={error}
          editable={!loading}
        />
        <View style={{ marginTop: spacing.lg }}>
          <Button
            title="Continue"
            icon="arrow-forward"
            onPress={handleContinue}
            loading={loading}
          />
        </View>
        {paymentTestMode ? (
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>
              Isolated test app — no real payments or notifications.
            </Text>
            {['member', 'organizer'].map((role) => (
              <Button
                key={role}
                title={`Use test ${role}`}
                variant="secondary"
                loading={loading}
                onPress={async () => {
                  setLoading(true);
                  setError(undefined);
                  try {
                    await signInWithEmailAndPassword(
                      getFirebaseAuth(),
                      `${role}@sfvga.test`,
                      'sfvga-local-test-only',
                    );
                  } catch {
                    setError(
                      'Test accounts are not ready. Start the payment test environment first.',
                    );
                  } finally {
                    setLoading(false);
                  }
                }}
              />
            ))}
          </View>
        ) : null}
        <Text
          style={[
            typography.caption,
            { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
          ]}
        >
          We&apos;ll text you a code to verify it&apos;s you
        </Text>
      </AuthShell>
      <RecaptchaVerifierModal ref={recaptchaRef} />
    </>
  );
}
