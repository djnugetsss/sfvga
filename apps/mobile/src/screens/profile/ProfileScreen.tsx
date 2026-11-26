import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
  AppState,
  Linking,
} from 'react-native';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { useNotificationPrefs } from '@/hooks/useNotificationPrefs';
import { notificationService } from '@/services/notificationService';
import { getFirestoreDb } from '@/services/firebase';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { ProfileStackParamList } from '@/navigation/ProfileStack';
import type { MainTabParamList } from '@/navigation/MainTabs';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { ADMIN_DASHBOARD_PERMISSIONS } from '@sfvga/shared-types';
import { toDate, formatEventDate } from '@/utils/dateFormat';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { AnimatedScreen } from '@/components/ui/AnimatedScreen';
import { functionsClient } from '@/services/functionsClient';
import { signOutUser } from '@/services/authService';

type ProfileNav = CompositeNavigationProp<
  NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>,
  CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;

const legalSite = 'https://sfvga-cabe6.web.app';

/**
 * Profile Screen (UI/UX §11): a short, calm settings screen — avatar + name, a Family Members
 * row, inline Notification Preference toggles (instant save), and a muted text-style Sign Out
 * with a single confirmation.
 */
export default function ProfileScreen() {
  const { colors, typography, spacing, minTapTarget, cardBorderRadius } = useTheme();
  const navigation = useNavigation<ProfileNav>();
  const { userProfile, signOut, firebaseUser } = useAuthContext();
  const adminAccessQuery = useAdminAccess();
  const { announcements, eventReminders, error, toggleAnnouncements, toggleEventReminders } =
    useNotificationPrefs();

  const [editNameOpen, setEditNameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [savingName, setSavingName] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'review' | 'verify'>('review');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [pushStatus, setPushStatus] = useState<
    'loading' | 'enabled' | 'disabled' | 'denied' | 'unavailable'
  >('loading');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const displayName = userProfile?.displayName?.trim() || 'Member';
  const adminAccess = adminAccessQuery.data;
  const canOpenAdmin = Boolean(
    adminAccess?.isSuperAdmin ||
    adminAccess?.organizationRole ||
    adminAccess?.eventAccess.some((event) =>
      event.permissions.some((permission) =>
        ADMIN_DASHBOARD_PERMISSIONS.some((item) => item === permission),
      ),
    ),
  );
  const adminAccessLabel = adminAccess?.isSuperAdmin
    ? adminAccess.superAdminRoleName || 'Super Admin'
    : (adminAccess?.organizationRole?.name ??
      (adminAccess?.eventAccess.length
        ? adminAccess.eventAccess
            .map((event) => {
              const expires = toDate(event.expiresAt);
              return `${event.eventName}${expires ? ` until ${formatEventDate(expires)}` : ''}`;
            })
            .join(' · ')
        : ''));

  useEffect(() => {
    if (editNameOpen) {
      setNameDraft(userProfile?.displayName?.trim() || '');
      setNameError(undefined);
    }
  }, [editNameOpen, userProfile?.displayName]);

  useEffect(() => {
    const refreshPushStatus = async () => {
      const permission = await notificationService.getPermissionStatus();
      if (permission === 'denied') setPushStatus('denied');
      else if (
        permission === 'granted' &&
        userProfile?.notificationPrefs?.pushEnabled !== false &&
        Boolean(userProfile?.expoPushTokens?.length || userProfile?.fcmTokens?.length)
      ) {
        setPushStatus('enabled');
      } else setPushStatus('disabled');
    };
    void refreshPushStatus();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshPushStatus();
    });
    return () => subscription.remove();
  }, [
    userProfile?.expoPushTokens?.length,
    userProfile?.fcmTokens?.length,
    userProfile?.notificationPrefs?.pushEnabled,
  ]);

  const enablePushNotifications = async (): Promise<boolean> => {
    if (!firebaseUser?.uid) return false;
    setPushBusy(true);
    setPushError(null);
    try {
      const result = await notificationService.registerForPushNotifications(firebaseUser.uid);
      setPushStatus(result === 'enabled' ? 'enabled' : result);
      if (result === 'denied') {
        setPushError('Notifications are blocked. Open phone settings to allow them.');
      } else if (result === 'unavailable') {
        setPushError(
          Platform.OS === 'web'
            ? 'On iPhone, add SFVGA to your Home Screen and open it there before enabling notifications.'
            : 'Push notifications are unavailable on this device.',
        );
      }
      return result === 'enabled';
    } catch {
      setPushError("Couldn't enable notifications. Please try again.");
      return false;
    } finally {
      setPushBusy(false);
    }
  };

  const handlePushToggle = async (value: boolean) => {
    if (value) {
      await enablePushNotifications();
      return;
    }
    if (!firebaseUser?.uid) return;
    setPushBusy(true);
    setPushError(null);
    try {
      await notificationService.unregister(firebaseUser.uid);
      setPushStatus('disabled');
    } catch {
      setPushError("Couldn't update notifications. Please try again.");
    } finally {
      setPushBusy(false);
    }
  };

  const handleAnnouncementsToggle = async (value: boolean) => {
    if (value && pushStatus !== 'enabled') {
      const enabled = await enablePushNotifications();
      if (!enabled) return;
    }
    await toggleAnnouncements(value);
  };

  const handleEventRemindersToggle = async (value: boolean) => {
    if (value && pushStatus !== 'enabled') {
      const enabled = await enablePushNotifications();
      if (!enabled) return;
    }
    await toggleEventReminders(value);
  };

  const saveDisplayName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameError('Please enter your name');
      return;
    }
    if (!firebaseUser?.uid) return;

    setSavingName(true);
    setNameError(undefined);
    try {
      await updateDoc(doc(getFirestoreDb(), 'users', firebaseUser.uid), {
        displayName: trimmed,
        updatedAt: serverTimestamp(),
      });
      setEditNameOpen(false);
    } catch {
      setNameError("Couldn't save — try again.");
    } finally {
      setSavingName(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
      setSignOutConfirmOpen(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteStep !== 'verify' || deleteConfirmation !== 'DELETE') return;
    setDeletingAccount(true);
    setDeleteError(null);
    try {
      await functionsClient.call<{ confirm: string }, { status: 'completed' | 'processing' }>(
        'auth_deleteAccount',
        { confirm: deleteConfirmation },
      );
      // Do not re-register a push token or recreate a deleted Firestore profile.
      await signOutUser();
      setDeleteConfirmOpen(false);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'Could not start account deletion. Please try again.',
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.md, paddingBottom: spacing.xl }]}
      >
        <AnimatedScreen>
          <ScreenHeader eyebrow="Your account" title="Profile" subtitle="Manage your details, family, and notification preferences." />
        </AnimatedScreen>

        <AnimatedScreen delay={70}>
          <Card style={[styles.identityCard, { marginTop: spacing.sm }]}>
            <Avatar
              name={displayName}
              photoUrl={userProfile?.photoUrl}
              size={72}
              backgroundColor={colors.accentSoft}
              textColor={colors.accentStrong}
            />
            <View style={styles.identityCopy}>
              <Text
                numberOfLines={2}
                style={[typography.headingLarge, { color: colors.textPrimary }]}
              >
                {displayName}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>
                {firebaseUser?.phoneNumber ?? 'SFVGA member'}
              </Text>
              <TouchableOpacity
                onPress={() => setEditNameOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Edit your name"
                style={[styles.editButton, { minHeight: minTapTarget, borderColor: colors.border }]}
              >
                <AppIcon name="pencil-outline" size={16} color={colors.deepBlue} />
                <Text style={[typography.label, { color: colors.deepBlue }]}>Edit</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </AnimatedScreen>

        <AnimatedScreen delay={120} style={{ marginTop: spacing.lg }}>
          <SectionHeader title="Account" />
          <Card style={{ marginTop: spacing.sm, padding: 0 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('FamilyMembers')}
              accessibilityRole="button"
              accessibilityLabel="Family Members"
              style={[styles.rowButton, { minHeight: 68, paddingHorizontal: spacing.md }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.brandSoft }]}>
                <AppIcon name="people-outline" size={20} color={colors.deepBlue} />
              </View>
              <View style={styles.rowCopy}>
                <Text
                  style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '700' }]}
                >
                  Family members
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Manage people you register with
                </Text>
              </View>
              <AppIcon name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {canOpenAdmin ? (
              <>
                <View style={[styles.divider, { backgroundColor: `${colors.warmGray400}33` }]} />
                <TouchableOpacity
                  onPress={() => navigation.navigate('AdminDashboard')}
                  accessibilityRole="button"
                  accessibilityLabel="Admin dashboard"
                  style={[styles.rowButton, { minHeight: 76, paddingHorizontal: spacing.md }]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}>
                    <AppIcon name="grid-outline" size={20} color={colors.accentStrong} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text
                      style={[
                        typography.bodyMedium,
                        { color: colors.textPrimary, fontWeight: '700' },
                      ]}
                    >
                      Admin dashboard
                    </Text>
                    <Text
                      style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}
                    >
                      {adminAccessLabel}
                    </Text>
                  </View>
                  <AppIcon name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </>
            ) : null}
          </Card>
        </AnimatedScreen>

        <AnimatedScreen delay={170} style={{ marginTop: spacing.lg }}>
          <SectionHeader title="Notifications" />
          <Card style={{ padding: 0, marginTop: spacing.sm }}>
            <View style={[styles.prefRow, { minHeight: 76, paddingHorizontal: spacing.md }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.brandSoft }]}>
                <AppIcon name="notifications-outline" size={20} color={colors.deepBlue} />
              </View>
              <View style={styles.rowCopy}>
                <Text
                  style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '700' }]}
                >
                  Phone notifications
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  {pushStatus === 'enabled'
                    ? 'Allowed on this phone'
                    : pushStatus === 'denied'
                      ? 'Blocked in phone settings'
                      : pushStatus === 'unavailable'
                        ? Platform.OS === 'web'
                          ? 'Add to Home Screen to enable on iPhone'
                          : 'Not supported on this device'
                        : 'Get important SFVGA updates'}
                </Text>
              </View>
              <Switch
                value={pushStatus === 'enabled'}
                onValueChange={(value) => void handlePushToggle(value)}
                disabled={pushBusy || pushStatus === 'loading' || pushStatus === 'unavailable'}
                trackColor={{ true: colors.brand, false: colors.border }}
                thumbColor={colors.white}
                {...(Platform.OS === 'web' ? { activeThumbColor: colors.white } : {})}
                ios_backgroundColor={colors.border}
                accessibilityLabel="Phone notifications"
                accessibilityHint="Allows SFVGA to send notifications to this phone"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: `${colors.warmGray400}33` }]} />
            <View style={[styles.prefRow, { minHeight: 68, paddingHorizontal: spacing.md }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.brandSoft }]}>
                <AppIcon name="megaphone-outline" size={19} color={colors.deepBlue} />
              </View>
              <Text
                style={[
                  typography.bodyMedium,
                  { color: colors.textPrimary, fontWeight: '600', flex: 1 },
                ]}
              >
                Announcements
              </Text>
              <Switch
                value={announcements}
                onValueChange={handleAnnouncementsToggle}
                disabled={pushBusy || pushStatus === 'unavailable'}
                trackColor={{ true: colors.brand, false: colors.border }}
                thumbColor={colors.white}
                {...(Platform.OS === 'web' ? { activeThumbColor: colors.white } : {})}
                ios_backgroundColor={colors.border}
                accessibilityLabel="Announcements notifications"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: `${colors.warmGray400}33` }]} />
            <View style={[styles.prefRow, { minHeight: 68, paddingHorizontal: spacing.md }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}>
                <AppIcon name="alarm-outline" size={19} color={colors.accentStrong} />
              </View>
              <Text
                style={[
                  typography.bodyMedium,
                  { color: colors.textPrimary, fontWeight: '600', flex: 1 },
                ]}
              >
                Event reminders
              </Text>
              <Switch
                value={eventReminders}
                onValueChange={handleEventRemindersToggle}
                disabled={pushBusy || pushStatus === 'unavailable'}
                trackColor={{ true: colors.brand, false: colors.border }}
                thumbColor={colors.white}
                {...(Platform.OS === 'web' ? { activeThumbColor: colors.white } : {})}
                ios_backgroundColor={colors.border}
                accessibilityLabel="Event reminder notifications"
              />
            </View>
          </Card>
          {pushStatus === 'denied' && Platform.OS !== 'web' ? (
            <TouchableOpacity
              onPress={() => void Linking.openSettings()}
              accessibilityRole="button"
              accessibilityLabel="Open phone notification settings"
              style={{ minHeight: minTapTarget, justifyContent: 'center', alignSelf: 'flex-start' }}
            >
              <Text style={[typography.label, { color: colors.deepBlue }]}>
                Open phone settings
              </Text>
            </TouchableOpacity>
          ) : null}
          {pushError ? (
            <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>
              {pushError}
            </Text>
          ) : null}
          {error ? (
            <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>
              {error}
            </Text>
          ) : null}
        </AnimatedScreen>

        <AnimatedScreen delay={210} style={{ marginTop: spacing.lg }}>
          <SectionHeader title="Privacy & help" />
          <Card style={{ padding: 0, marginTop: spacing.sm }}>
            {[
              {
                label: 'Privacy notice',
                path: '/privacy.html',
                icon: 'shield-checkmark-outline' as const,
              },
              {
                label: 'Terms of use',
                path: '/terms.html',
                icon: 'document-text-outline' as const,
              },
            ].map((item, index) => (
              <React.Fragment key={item.path}>
                {index > 0 ? (
                  <View style={[styles.divider, { backgroundColor: `${colors.warmGray400}33` }]} />
                ) : null}
                <TouchableOpacity
                  onPress={() => void Linking.openURL(`${legalSite}${item.path}`)}
                  accessibilityRole="link"
                  accessibilityLabel={item.label}
                  style={[styles.rowButton, { minHeight: 68, paddingHorizontal: spacing.md }]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: colors.brandSoft }]}>
                    <AppIcon name={item.icon} size={20} color={colors.deepBlue} />
                  </View>
                  <Text
                    style={[
                      typography.bodyMedium,
                      { color: colors.textPrimary, fontWeight: '600', flex: 1 },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <AppIcon name="open-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </Card>
          <TouchableOpacity
            onPress={() => {
              setDeleteError(null);
              setDeleteStep('review');
              setDeleteConfirmation('');
              setDeleteConfirmOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Delete my account"
            style={[
              styles.signOutButton,
              { minHeight: minTapTarget, borderColor: colors.border, marginTop: spacing.md },
            ]}
          >
            <AppIcon name="person-remove-outline" size={19} color={colors.error} />
            <Text style={[typography.label, { color: colors.error }]}>Delete my account</Text>
          </TouchableOpacity>
        </AnimatedScreen>

        <TouchableOpacity
          onPress={() => setSignOutConfirmOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={[
            styles.signOutButton,
            { marginTop: spacing.xl, minHeight: minTapTarget, borderColor: colors.border },
          ]}
        >
          <AppIcon name="log-out-outline" size={19} color={colors.textSecondary} />
          <Text style={[typography.label, { color: colors.textSecondary }]}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={deleteConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !deletingAccount && setDeleteConfirmOpen(false)}
      >
        <View style={[styles.modalBackdrop, { justifyContent: 'center', padding: spacing.lg }]}>
          <View
            style={[
              styles.confirmCard,
              {
                backgroundColor: colors.background,
                borderRadius: cardBorderRadius,
                padding: spacing.lg,
                maxHeight: '85%',
              },
            ]}
          >
            <ScrollView style={{ flexShrink: 1 }}>
              <Text style={[typography.headingMedium, { color: colors.textPrimary }]}>
                {deleteStep === 'review' ? 'Delete your SFVGA account?' : 'Final confirmation'}
              </Text>
              {deleteStep === 'review' ? (
                <>
                  <Text
                    style={[
                      typography.bodyMedium,
                      { color: colors.textSecondary, marginTop: spacing.sm },
                    ]}
                  >
                    This removes your sign-in, profile, contact details, family list,
                    notifications, and private registration messages. Your tickets will stop
                    working immediately. SFVGA keeps attendee and payer names in active
                    registration records for six months after the event, then removes those names.
                    Some event or audit records remain; backup copies may contain earlier data
                    while SFVGA finalizes its backup policy.
                  </Text>
                  <Text
                    style={[
                      typography.bodyMedium,
                      { color: colors.textSecondary, marginTop: spacing.sm },
                    ]}
                  >
                    This cannot be undone. If cleanup needs more time, it will continue after you
                    sign out.
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={[
                      typography.bodyMedium,
                      { color: colors.textSecondary, marginTop: spacing.sm },
                    ]}
                  >
                    To confirm this permanent action, type DELETE below. For security, you must
                    also have signed in within the last 15 minutes.
                  </Text>
                  <View style={{ marginTop: spacing.md }}>
                    <Input
                      label="Type DELETE to confirm"
                      value={deleteConfirmation}
                      onChangeText={setDeleteConfirmation}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      editable={!deletingAccount}
                      accessibilityHint="Type the word DELETE exactly to enable account deletion"
                    />
                  </View>
                </>
              )}
              {deleteError ? (
                <Text style={[typography.caption, { color: colors.error, marginTop: spacing.sm }]}>
                  {deleteError}
                </Text>
              ) : null}
            </ScrollView>
            <View style={{ marginTop: spacing.lg }}>
              {deleteStep === 'review' ? (
                <Button title="Continue to final confirmation" onPress={() => setDeleteStep('verify')} />
              ) : (
                <Button
                  title="Permanently delete my account"
                  onPress={() => void handleDeleteAccount()}
                  disabled={deleteConfirmation !== 'DELETE'}
                  loading={deletingAccount}
                />
              )}
              {deleteError?.includes('sign out and sign back in') ? (
                <View style={{ marginTop: spacing.sm }}>
                  <Button
                    title="Sign out to verify"
                    variant="secondary"
                    onPress={() => void signOutUser()}
                  />
                </View>
              ) : null}
              <View style={{ marginTop: spacing.sm }}>
                <Button
                  title={deleteStep === 'review' ? 'Keep my account' : 'Go back'}
                  variant="secondary"
                  onPress={() => {
                    if (deleteStep === 'verify') {
                      setDeleteStep('review');
                      setDeleteConfirmation('');
                      setDeleteError(null);
                    } else setDeleteConfirmOpen(false);
                  }}
                  disabled={deletingAccount}
                />
              </View>
              {deleteStep === 'verify' ? (
                <View style={{ marginTop: spacing.sm }}>
                  <Button
                    title="Cancel deletion"
                    variant="text"
                    onPress={() => setDeleteConfirmOpen(false)}
                    disabled={deletingAccount}
                  />
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={signOutConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !signingOut && setSignOutConfirmOpen(false)}
      >
        <View style={[styles.modalBackdrop, { justifyContent: 'center', padding: spacing.lg }]}>
          <View
            style={[
              styles.confirmCard,
              {
                backgroundColor: colors.background,
                borderRadius: cardBorderRadius,
                padding: spacing.lg,
              },
            ]}
          >
            <Text
              style={[typography.headingMedium, { color: colors.textPrimary, textAlign: 'center' }]}
            >
              Sign out?
            </Text>
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
              ]}
            >
              You&apos;ll return to the SFVGA sign-in page.
            </Text>
            <View style={{ marginTop: spacing.lg }}>
              <Button title="Sign Out" onPress={() => void handleSignOut()} loading={signingOut} />
              <View style={{ marginTop: spacing.sm }}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setSignOutConfirmOpen(false)}
                  disabled={signingOut}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editNameOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditNameOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.background,
                borderTopLeftRadius: cardBorderRadius,
                borderTopRightRadius: cardBorderRadius,
                padding: spacing.md,
              },
            ]}
          >
            <Text
              style={[
                typography.headingMedium,
                { color: colors.textPrimary, marginBottom: spacing.md },
              ]}
            >
              Your name
            </Text>
            <Input
              label="Full name"
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="e.g. Priya Shah"
              autoCapitalize="words"
              autoFocus
              error={nameError}
              editable={!savingName}
            />
            <View style={{ marginTop: spacing.lg }}>
              <Button title="Save" onPress={saveDisplayName} loading={savingName} />
              <View style={{ marginTop: spacing.sm }}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setEditNameOpen(false)}
                  disabled={savingName}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { width: '100%', maxWidth: 740, alignSelf: 'center' },
  identityCard: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  identityCopy: { flex: 1, minWidth: 0, marginLeft: 16 },
  editButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
  },
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { minWidth: 0, flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  signOutButton: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    paddingBottom: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
});
