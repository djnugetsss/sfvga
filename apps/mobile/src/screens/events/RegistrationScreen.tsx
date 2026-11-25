import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, StyleSheet, SafeAreaView, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQueryClient } from '@tanstack/react-query';
import type { RegistrationAttendee } from '@sfvga/shared-types';
import {
  ageGroupFromYears,
  childRuleLabelPlural,
  normalizeEventPricing,
  priceForAttendee,
  resolvePriceTier,
} from '@sfvga/shared-validation';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { useEvent } from '@/hooks/useEvent';
import { useFamilyMembers } from '@/hooks/useFamilyMembers';
import { useMyRegistrations } from '@/hooks/useMyRegistrations';
import { FamilyMemberPicker } from '@/components/forms/FamilyMemberPicker';
import { PriceBreakdown } from '@/components/events/PriceBreakdown';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { functionsClient } from '@/services/functionsClient';
import { getErrorMessage } from '@/utils/errors';
import { toDate, formatEventDate } from '@/utils/dateFormat';
import type { EventStackParamList } from '@/navigation/EventStack';
import type { MainTabParamList } from '@/navigation/MainTabs';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { AnimatedScreen } from '@/components/ui/AnimatedScreen';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { RegistrationStatus } from '@/components/events/RegistrationStatus';
import { RegistrationConfirmation } from '@/components/events/RegistrationConfirmation';
import { useClock } from '@/hooks/useClock';
import {
  closePaymentTab,
  openPaymentLinkAfterSave,
  paymentActionOpen,
  reservePaymentTab,
} from '@/utils/payment';

type RegistrationNav = CompositeNavigationProp<
  NativeStackNavigationProp<EventStackParamList, 'Registration'>,
  BottomTabNavigationProp<MainTabParamList>
>;

/** One-off attendee not saved to the member's family list. */
interface Guest {
  id: string;
  name: string;
  ageYears?: number;
}

type AgeDrafts = Record<string, string>;

function parseAgeDraft(raw: string | undefined): number | undefined {
  if (raw == null || raw.trim() === '') return undefined;
  const n = Number(raw.trim());
  return Number.isInteger(n) && n >= 0 && n <= 120 ? n : undefined;
}

export default function RegistrationScreen() {
  const { colors, typography, spacing } = useTheme();
  const route = useRoute<RouteProp<EventStackParamList, 'Registration'>>();
  const navigation = useNavigation<RegistrationNav>();
  const { eventId } = route.params;
  const now = useClock();
  const queryClient = useQueryClient();

  const { userProfile } = useAuthContext();
  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: familyMembers = [], isLoading: familyLoading } = useFamilyMembers();
  const { data: myRegistrations = [], isLoading: registrationsLoading } = useMyRegistrations();

  const [selfSelected, setSelfSelected] = useState(true);
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<string[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestAgeDraft, setGuestAgeDraft] = useState('');
  const [ageDrafts, setAgeDrafts] = useState<AgeDrafts>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedPaymentStatus, setConfirmedPaymentStatus] = useState<
    'unpaid' | 'paid' | 'free' | null
  >(null);

  const initializedRef = useRef(false);
  const agesSeededRef = useRef(false);
  const dataReady = !eventLoading && !familyLoading && !registrationsLoading;
  const existingForEvent = myRegistrations.find((r) => r.eventId === eventId);
  const stuckUnpaid = existingForEvent?.paymentStatus === 'unpaid';
  const selfName = userProfile?.displayName?.trim() || 'You';

  const pricing = useMemo(
    () => normalizeEventPricing(event?.pricing as Parameters<typeof normalizeEventPricing>[0]),
    [event?.pricing],
  );
  const hasChildRule = Boolean(pricing.childRule);

  useEffect(() => {
    if (initializedRef.current || !dataReady) return;
    initializedRef.current = true;

    const lastReg = [...myRegistrations].sort(
      (a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0),
    )[0];
    if (!lastReg) return;

    setSelfSelected(lastReg.attendees.some((a) => a.familyMemberId === 'self'));
    setSelectedFamilyIds(
      lastReg.attendees
        .map((a) => a.familyMemberId)
        .filter((id) => id !== 'self' && familyMembers.some((m) => m.id === id)),
    );
  }, [dataReady, myRegistrations, familyMembers]);

  // Prefill ages from family profiles once (and keep guest ages in guest objects).
  useEffect(() => {
    if (!dataReady || agesSeededRef.current) return;
    agesSeededRef.current = true;
    const next: AgeDrafts = {};
    familyMembers.forEach((m) => {
      if (m.ageYears != null) next[m.id] = String(m.ageYears);
    });
    setAgeDrafts(next);
  }, [dataReady, familyMembers]);

  const setAgeFor = (key: string, value: string) => {
    setAgeDrafts((prev) => ({ ...prev, [key]: value.replace(/[^\d]/g, '') }));
  };

  const attendees = useMemo<RegistrationAttendee[]>(() => {
    const list: RegistrationAttendee[] = [];
    if (selfSelected) {
      const ageYears = parseAgeDraft(ageDrafts.self);
      list.push({
        familyMemberId: 'self',
        name: selfName,
        ageGroup: ageGroupFromYears(ageYears),
        isGuest: false,
        ...(ageYears !== undefined ? { ageYears } : {}),
      });
    }
    familyMembers.forEach((m) => {
      if (!selectedFamilyIds.includes(m.id)) return;
      const ageYears = parseAgeDraft(ageDrafts[m.id]) ?? m.ageYears;
      const isGuest = m.relation === 'guest';
      list.push({
        familyMemberId: m.id,
        name: m.name,
        ageGroup: ageGroupFromYears(ageYears),
        isGuest,
        ...(typeof ageYears === 'number' ? { ageYears } : {}),
      });
    });
    guests.forEach((g) => {
      list.push({
        familyMemberId: g.id,
        name: g.name,
        ageGroup: ageGroupFromYears(g.ageYears),
        isGuest: true,
        ...(typeof g.ageYears === 'number' ? { ageYears: g.ageYears } : {}),
      });
    });
    return list;
  }, [selfSelected, selfName, familyMembers, selectedFamilyIds, guests, ageDrafts]);

  const priceLines = useMemo(() => {
    const counts = { member: 0, guest: 0, child: 0 };
    attendees.forEach((a) => {
      const tier = resolvePriceTier(pricing, {
        isGuest: Boolean(a.isGuest),
        ageYears: a.ageYears,
      });
      counts[tier] += 1;
    });
    const lines: { label: string; count: number; unitPrice: number }[] = [];
    if (counts.member > 0) {
      lines.push({
        label: counts.member === 1 ? 'member' : 'members',
        count: counts.member,
        unitPrice: pricing.member,
      });
    }
    if (counts.guest > 0) {
      lines.push({
        label: counts.guest === 1 ? 'guest' : 'guests',
        count: counts.guest,
        unitPrice: pricing.guest,
      });
    }
    if (counts.child > 0 && pricing.childRule) {
      lines.push({
        label: childRuleLabelPlural(pricing.childRule.maxAgeInclusive, counts.child),
        count: counts.child,
        unitPrice: pricing.childRule.price,
      });
    }
    return lines;
  }, [attendees, pricing]);

  const total = useMemo(
    () =>
      attendees.reduce(
        (sum, a) =>
          sum +
          priceForAttendee(pricing, {
            isGuest: Boolean(a.isGuest),
            ageYears: a.ageYears,
          }),
        0,
      ),
    [attendees, pricing],
  );

  const toggleFamily = (id: string) =>
    setSelectedFamilyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const addGuest = () => {
    const name = guestName.trim();
    if (!name) return;
    const ageYears = parseAgeDraft(guestAgeDraft);
    setGuests((prev) => [...prev, { id: `guest-${Date.now()}`, name, ageYears }]);
    setGuestName('');
    setGuestAgeDraft('');
    setAddingGuest(false);
  };

  const childRuleNeedsAges =
    hasChildRule && attendees.some((a) => a.ageYears == null || Number.isNaN(a.ageYears));

  const handleSubmit = async () => {
    if ((!stuckUnpaid && attendees.length === 0) || submitting) return;
    if (!stuckUnpaid && hasChildRule && childRuleNeedsAges) {
      setErrorMessage('Enter an age for each person so child pricing can be applied correctly.');
      return;
    }
    const paymentTab = total > 0 && event?.paymentUrl ? reservePaymentTab() : null;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await functionsClient.registrations.create({
        eventId,
        attendees:
          attendees.length > 0
            ? attendees
            : (existingForEvent?.attendees ?? [
                {
                  familyMemberId: 'self',
                  name: selfName,
                  ageGroup: 'adult',
                  isGuest: false,
                },
              ]),
      });

      // Keep the saved registration syncing, but do not delay opening payment or
      // showing the confirmation while unrelated ticket queries refetch.
      void queryClient.invalidateQueries({ queryKey: ['myRegistrations'] });
      void queryClient.invalidateQueries({ queryKey: ['myTickets'] });
      if (result.paymentStatus === 'unpaid') {
        if (event?.paymentUrl) await openPaymentLinkAfterSave(event.paymentUrl, paymentTab);
        return;
      }
      closePaymentTab(paymentTab);
      setConfirmedPaymentStatus(result.paymentStatus);
      setConfirmed(true);
    } catch (error) {
      closePaymentTab(paymentTab);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    const paidAwaitingReview = confirmedPaymentStatus === 'unpaid';
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <RegistrationConfirmation
          title={paidAwaitingReview ? 'Registration submitted' : "You're registered!"}
          message={
            paidAwaitingReview
              ? 'Thank you! Our team will verify your payment. Your event check-in QR codes will appear in Tickets once payment is approved. Verification may take some time, and we’ll notify you when your tickets are ready.'
              : confirmedPaymentStatus === 'paid'
                ? 'Registration confirmed. Your tickets will appear in Tickets shortly.'
                : 'Your free registration is confirmed. Your tickets will appear in Tickets shortly.'
          }
          primaryAction={{
            title: paidAwaitingReview ? 'View registration status' : 'View My Tickets',
            onPress: paidAwaitingReview
              ? () => setConfirmed(false)
              : () => navigation.navigate('Tickets', { focusEventId: eventId }),
          }}
          secondaryAction={
            existingForEvent && !paidAwaitingReview
              ? { title: 'View registration status', onPress: () => setConfirmed(false) }
              : undefined
          }
        />
      </SafeAreaView>
    );
  }

  if (eventLoading || familyLoading || registrationsLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.lg }}>
          <View style={{ width: '100%', maxWidth: 940, alignSelf: 'center' }}>
            <ScreenHeader title="Register" />
            <Skeleton height={18} width="65%" radius={5} style={{ marginTop: spacing.sm, marginBottom: spacing.lg }} />
            <Skeleton height={23} width="48%" radius={5} style={{ marginBottom: spacing.sm }} />
            {[0, 1].map((item) => (
              <View key={item} style={{ minHeight: 70, flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: spacing.sm, borderWidth: 1, borderRadius: 16, borderColor: colors.border, backgroundColor: colors.cardBackground }}>
                <Skeleton width={26} height={26} radius={8} style={{ marginRight: 12, marginBottom: 0 }} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="55%" height={18} radius={5} style={{ marginBottom: 0 }} />
                  <Skeleton width="30%" height={14} radius={5} style={{ marginBottom: 0 }} />
                </View>
              </View>
            ))}
            <Skeleton height={18} width="38%" radius={5} style={{ marginTop: spacing.sm, marginBottom: spacing.lg }} />
            <Card style={{ marginTop: spacing.lg }}>
              <Skeleton height={18} width="72%" radius={5} style={{ marginBottom: spacing.sm }} />
              <Skeleton height={18} width="65%" radius={5} style={{ marginBottom: spacing.md }} />
              <Skeleton height={26} width="45%" radius={5} style={{ marginBottom: 0 }} />
            </Card>
          </View>
        </ScrollView>
        <View style={[styles.footer, { padding: spacing.md, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.content}>
            <Skeleton height={48} radius={12} style={{ marginBottom: 0 }} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          message="We couldn't find this event."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  if (existingForEvent) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <RegistrationStatus
          key={existingForEvent.id}
          event={event}
          registration={existingForEvent}
          onTickets={() => navigation.navigate('Tickets', { focusEventId: eventId })}
          onMessages={() => navigation.navigate('Messages', { eventId })}
          onSubmitted={() => {
            setConfirmedPaymentStatus('unpaid');
            setConfirmed(true);
          }}
          initialError={errorMessage}
        />
      </SafeAreaView>
    );
  }

  const headerDate = toDate(event.startAt);
  const childCutoff = pricing.childRule?.maxAgeInclusive;

  const ageRows: { key: string; label: string }[] = [];
  if (hasChildRule) {
    if (selfSelected) ageRows.push({ key: 'self', label: selfName });
    familyMembers.forEach((m) => {
      if (selectedFamilyIds.includes(m.id)) ageRows.push({ key: m.id, label: m.name });
    });
    guests.forEach((g) => ageRows.push({ key: g.id, label: g.name }));
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { padding: spacing.md, paddingBottom: spacing.lg }]}
      >
        <AnimatedScreen>
          <ScreenHeader
            eyebrow={headerDate ? formatEventDate(headerDate) : 'Event registration'}
            title="Register"
            subtitle={event.title}
          />
        </AnimatedScreen>

        <AnimatedScreen delay={70}>
          <Text
            style={[typography.headingMedium, { color: colors.brand, marginBottom: spacing.sm }]}
          >
            Who&apos;s coming?
          </Text>

          <FamilyMemberPicker
            members={familyMembers}
            selectedIds={selectedFamilyIds}
            onToggle={toggleFamily}
            selfName={selfName}
            selfSelected={selfSelected}
            onToggleSelf={() => setSelfSelected((s) => !s)}
          />
        </AnimatedScreen>

        {guests.map((g) => (
          <View
            key={g.id}
            style={[
              styles.guestRow,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
          >
            <View style={styles.guestIdentity}>
              <View style={[styles.guestIcon, { backgroundColor: colors.accentSoft }]}>
                <AppIcon name="person-outline" size={18} color={colors.accentStrong} />
              </View>
              <Text
                style={[typography.bodyLarge, { color: colors.textPrimary, fontWeight: '700' }]}
              >
                {g.name}
                {g.ageYears != null ? ` · Age ${g.ageYears}` : ' · Guest'}
              </Text>
            </View>
            <MotionPressable
              onPress={() => setGuests((prev) => prev.filter((x) => x.id !== g.id))}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${g.name}`}
              style={styles.inlineTap}
              pressedScale={0.92}
            >
              <AppIcon name="close-circle-outline" size={22} color={colors.error} />
            </MotionPressable>
          </View>
        ))}

        {addingGuest ? (
          <Card style={{ marginTop: spacing.sm }}>
            <Input
              label="Guest name"
              value={guestName}
              onChangeText={setGuestName}
              placeholder="Full name"
            />
            {hasChildRule ? (
              <View style={{ marginTop: spacing.sm }}>
                <Input
                  label="Age (years)"
                  value={guestAgeDraft}
                  onChangeText={(text) => setGuestAgeDraft(text.replace(/[^\d]/g, ''))}
                  placeholder="e.g. 7"
                  keyboardType="number-pad"
                />
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Button title="Add guest" onPress={addGuest} disabled={!guestName.trim()} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => {
                    setAddingGuest(false);
                    setGuestName('');
                    setGuestAgeDraft('');
                  }}
                />
              </View>
            </View>
          </Card>
        ) : (
          <MotionPressable
            onPress={() => setAddingGuest(true)}
            accessibilityRole="button"
            style={[styles.inlineTap, { marginTop: spacing.xs }]}
            pressedScale={0.98}
          >
            <Text style={[typography.bodyLarge, { color: colors.brand, fontWeight: '600' }]}>
              <AppIcon name="person-add-outline" size={18} color={colors.brand} /> Add a guest
            </Text>
          </MotionPressable>
        )}

        {familyMembers.length === 0 ? (
          <MotionPressable
            onPress={() => navigation.navigate('Profile', { screen: 'FamilyMembers' })}
            accessibilityRole="button"
            style={[styles.inlineTap, { marginTop: spacing.xs }]}
            pressedScale={0.98}
          >
            <Text style={[typography.bodyLarge, { color: colors.brand, fontWeight: '600' }]}>
              Add family members
            </Text>
          </MotionPressable>
        ) : null}

        {hasChildRule && ageRows.length > 0 ? (
          <AnimatedScreen delay={140}>
            <Card style={{ marginTop: spacing.lg }}>
              <Text
                style={[
                  typography.headingMedium,
                  { color: colors.brand, marginBottom: spacing.xs },
                ]}
              >
                Ages
              </Text>
              <Text
                style={[
                  typography.bodyMedium,
                  { color: colors.textSecondary, marginBottom: spacing.md },
                ]}
              >
                Kids age {childCutoff} and under pay the child rate
                {pricing.childRule?.price === 0 ? ' (free)' : ''}.
              </Text>
              {ageRows.map((row) => {
                if (row.key.startsWith('guest-')) {
                  const guest = guests.find((g) => g.id === row.key);
                  return (
                    <View key={row.key} style={{ marginBottom: spacing.sm }}>
                      <Input
                        label={row.label}
                        value={guest?.ageYears != null ? String(guest.ageYears) : ''}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/[^\d]/g, '');
                          const ageYears = parseAgeDraft(cleaned);
                          setGuests((prev) =>
                            prev.map((g) => (g.id === row.key ? { ...g, ageYears } : g)),
                          );
                        }}
                        placeholder="Age in years"
                        keyboardType="number-pad"
                      />
                    </View>
                  );
                }
                return (
                  <View key={row.key} style={{ marginBottom: spacing.sm }}>
                    <Input
                      label={row.label}
                      value={ageDrafts[row.key] ?? ''}
                      onChangeText={(text) => setAgeFor(row.key, text)}
                      placeholder="Age in years"
                      keyboardType="number-pad"
                    />
                  </View>
                );
              })}
            </Card>
          </AnimatedScreen>
        ) : null}

        <AnimatedScreen delay={190}>
          <Card style={{ marginTop: spacing.lg }}>
            <PriceBreakdown lines={priceLines} total={total} />
          </Card>
        </AnimatedScreen>

        {total > 0 ? (
          <Card style={{ marginTop: spacing.md, gap: spacing.md }}>
            <Text style={[typography.headingMedium, { color: colors.textPrimary }]}>
              How payment works
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.compact }}>
              <Text style={[typography.label, { color: colors.brand, width: 24 }]}>1.</Text>
              <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>Continue below to save your attendees and open the payment page for ${total.toFixed(2)}.</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.compact }}>
              <Text style={[typography.label, { color: colors.brand, width: 24 }]}>2.</Text>
              <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>After paying, return here and finish registration. Payment alone does not provide tickets.</Text>
            </View>
          </Card>
        ) : null}
        {stuckUnpaid ? (
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
            ]}
          >
            You started registration earlier. Tap below to finish and get your tickets.
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { padding: spacing.md, backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <View style={styles.content}>
          {errorMessage ? (
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.error, marginBottom: spacing.sm, textAlign: 'center' },
              ]}
            >
              {errorMessage}
            </Text>
          ) : null}
          <Button
            title={
              !paymentActionOpen(event, now)
                ? 'Registration closed'
                : total > 0
                  ? 'Continue to payment'
                  : 'Complete registration'
            }
            icon={total > 0 ? 'open-outline' : 'checkmark-circle-outline'}
            onPress={handleSubmit}
            loading={submitting}
            disabled={!paymentActionOpen(event, now) || (attendees.length === 0 && !stuckUnpaid)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { width: '100%', maxWidth: 820, alignSelf: 'center' },
  footer: {
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  guestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  guestIdentity: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  guestIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineTap: { minHeight: 44, justifyContent: 'center' },
});
