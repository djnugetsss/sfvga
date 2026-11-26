import React, { useState } from 'react';
import { Image, Linking, Modal, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '@/components/ui/Card';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useTheme } from '@/providers/ThemeProvider';
import type { ProfileStackParamList } from '@/navigation/ProfileStack';
import board from '@/content/community/board.json';
import mission from '@/content/community/mission.json';
import membershipPlans from '@/content/community/membershipPlans.json';
import records from '@/content/community/records.json';
import resources from '@/content/community/resources.json';
import faqs from '@/content/community/faqs.json';
import leadership from '@/content/community/leadership.json';
import roles from '@/content/community/roles.json';
import gallery from '@/content/community/gallery.json';

type Topic = ProfileStackParamList['CommunityDetail']['topic'];
type CommunityNav = NativeStackNavigationProp<ProfileStackParamList>;

const topics: { key: Topic; title: string; description: string; icon: AppIconName }[] = [
  { key: 'about', title: 'Our mission', description: 'What brings SFVGA together', icon: 'heart-outline' },
  { key: 'board', title: 'Board & leadership', description: 'Meet the people serving our community', icon: 'people-outline' },
  { key: 'membership', title: 'Membership', description: 'Plans and how to join or renew', icon: 'card-outline' },
  { key: 'youth', title: 'Youth corner', description: 'Volunteer hours and activities', icon: 'sparkles-outline' },
  { key: 'resources', title: 'More about SFVGA', description: 'Membership, giving, documents, and contact', icon: 'document-text-outline' },
  { key: 'gallery', title: 'Community moments', description: 'Photos from our gatherings', icon: 'images-outline' },
];

const boardPhotos: Record<string, number> = {
  'jaymeen-desai': require('../../../assets/community/board/jaymeen-desai.jpg'),
  'monika-patel': require('../../../assets/community/board/monika-patel.jpg'),
  'bhavin-shah': require('../../../assets/community/board/bhavin-shah.jpg'),
  'mayank-shah': require('../../../assets/community/board/mayank-shah.jpg'),
  'pinal-kantawala': require('../../../assets/community/board/pinal-kantawala.jpg'),
  'ami-dave': require('../../../assets/community/board/ami-dave.jpg'),
  'bhakti-desai': require('../../../assets/community/board/bhakti-desai.jpg'),
};

function useCommunityStyles() {
  const theme = useTheme();
  return {
    ...theme,
    page: {
      flex: 1 as const,
      backgroundColor: theme.colors.background,
    },
    content: {
      width: '100%' as const,
      maxWidth: 740,
      alignSelf: 'center' as const,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.md,
    },
  };
}

function OpenLink({ label, url }: { label: string; url: string }) {
  const { colors, typography, spacing, minTapTarget } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => void Linking.openURL(url)}
      style={{ minHeight: minTapTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
    >
      <Text style={[typography.bodyMedium, { color: colors.brand, flex: 1 }]}>{label}</Text>
      <AppIcon name="open-outline" size={18} color={colors.brand} />
    </TouchableOpacity>
  );
}

export default function CommunityHubScreen() {
  const navigation = useNavigation<CommunityNav>();
  return <CommunityMenu onTopic={topic => navigation.navigate('CommunityDetail', { topic })} />;
}

export function CommunityMenu({ onTopic }: { onTopic: (topic: Topic) => void }) {
  const { colors, typography, spacing, page, content } = useCommunityStyles();
  return (
    <ScrollView style={page} contentContainerStyle={content}>
      <ScreenHeader
        eyebrow="San Fernando Valley Gujarati Association"
        title="More"
        subtitle="Board, youth programs, membership, and community resources."
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {topics.map(topic => (
          <TouchableOpacity
            key={topic.key}
            accessibilityRole="button"
            onPress={() => onTopic(topic.key)}
            style={{ width: '48%', alignItems: 'center', padding: spacing.sm, marginBottom: spacing.md }}
          >
            <View style={{ width: 58, height: 58, borderRadius: 29, borderWidth: 1, borderColor: colors.accentStrong, alignItems: 'center', justifyContent: 'center' }}>
              <AppIcon name={topic.icon} size={24} color={colors.accentStrong} />
            </View>
            <Text style={[typography.label, { textAlign: 'center', marginTop: spacing.sm, color: colors.textPrimary }]}>{topic.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

export function CommunityDetailScreen() {
  const route = useRoute<RouteProp<ProfileStackParamList, 'CommunityDetail'>>();
  return <CommunityTopic topicKey={route.params.topic} />;
}

export function CommunityTopic({ topicKey }: { topicKey: Topic }) {
  const { colors, typography, spacing, page, content } = useCommunityStyles();
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const topic = topics.find((item) => item.key === topicKey) ?? topics[0];

  return (
    <ScrollView style={page} contentContainerStyle={content}>
      <ScreenHeader eyebrow={topicKey === 'board' ? 'Leadership' : topicKey === 'youth' ? 'Next generation' : 'Association'} title={topicKey === 'board' ? 'The Board' : topicKey === 'youth' ? 'Youth' : topic.title} subtitle={topic.description} />

      {topic.key === 'about' ? (
        <>
          <Card>
            <SectionHeader title="Our mission" />
            {mission.filter((item) => item.kind === 'statement').map((item) => (
              <Text key={item.id} style={[typography.bodyMedium, { color: colors.textPrimary, lineHeight: 27, marginTop: spacing.sm }]}>{item.text}</Text>
            ))}
          </Card>
          <Card>
            <SectionHeader title="What we do" />
            {mission.filter((item) => item.kind === 'point').map((item) => (
              <View key={item.id} style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <AppIcon name="checkmark-circle-outline" color={colors.brand} size={20} />
                <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>{item.text}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {topic.key === 'board' ? (
        <>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
            SFVGA is guided by volunteers who serve the association and its members.
          </Text>
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            {board.map((person) => (
              <View key={person.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Image source={boardPhotos[person.id]} accessibilityLabel={person.name} style={{ width: 58, height: 58, borderRadius: 29 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.eyebrow, { color: colors.accentStrong, textTransform: 'uppercase' }]}>{person.role}</Text>
                  <Text style={[typography.headingLarge, { color: colors.textPrimary, fontSize: 21, lineHeight: 29 }]}>{person.name}</Text>
                </View>
              </View>
            ))}
          </View>
          <Card>
            <SectionHeader title="Extended leadership" />
            {leadership.map((person) => (
              <Text key={person.id} style={[typography.bodyMedium, { color: colors.textPrimary, marginTop: spacing.sm }]}>{person.name} · {person.role}</Text>
            ))}
          </Card>
          <Card>
            <SectionHeader title="Board responsibilities" subtitle="Tap a role to read more" />
            {roles.filter((role) => role.scope === 'board').map((role) => (
              <View key={role.id}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ expanded: expandedRole === role.id }}
                  onPress={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                  style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                >
                  <Text style={[typography.bodyMedium, { color: colors.brand, flex: 1, fontWeight: '600' }]}>{role.title}</Text>
                  <AppIcon name={expandedRole === role.id ? 'chevron-up' : 'chevron-down'} color={colors.brand} size={18} />
                </TouchableOpacity>
                {expandedRole === role.id ? role.responsibilities.map((line, index) => (
                  <Text key={`${role.id}-${index}`} style={[typography.bodyMedium, { color: colors.textSecondary, marginBottom: spacing.sm }]}>• {line}</Text>
                )) : null}
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {topic.key === 'membership' ? (
        <>
          <Card>
            <SectionHeader title="Membership plans" subtitle="Confirm current dues with SFVGA before making a payment." />
            {membershipPlans.map((plan) => (
              <View key={plan.id} style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '700' }]}>{plan.name} · ${plan.price}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>{plan.note}</Text>
              </View>
            ))}
          </Card>
          <Card>
            <SectionHeader title="Join or renew" />
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              Membership applications and renewals are handled by the association. Review the current instructions on its website.
            </Text>
            <OpenLink label="Open SFVGA membership" url="https://sfvga.org/membership" />
          </Card>
        </>
      ) : null}

      {topic.key === 'youth' ? (
        <>
          <Image
            source={require('../../../assets/partner/youthvolunteer.jpg')}
            accessibilityLabel="SFVGA youth volunteers at a community gathering"
            resizeMode="cover"
            style={{ width: '100%', height: 205, borderRadius: 16 }}
          />
          <Card>
            <SectionHeader title="Our next generation" />
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              SFVGA youth activities build leadership, community service, and life skills.
            </Text>
          </Card>
          <Card>
            <SectionHeader title="Volunteer hours" />
            <OpenLink label="View volunteer hours" url={resources.find((item) => item.id === 'youth-hours')?.url ?? 'https://sfvga.org'} />
          </Card>
          <Card>
            <SectionHeader title="CPR training" />
            <OpenLink label="View CPR training photos" url={resources.find((item) => item.id === 'youth-cpr')?.url ?? 'https://sfvga.org'} />
          </Card>
        </>
      ) : null}

      {topic.key === 'resources' ? (
        <>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Everything SFVGA offers, from membership to the records that guide the association.</Text>
          <Card>
            <SectionHeader title="Membership and giving" />
            <OpenLink label="Become a member" url={resources.find((item) => item.id === 'membership')?.url ?? 'https://sfvga.org/membership'} />
            <OpenLink label="Support SFVGA" url={resources.find((item) => item.id === 'donation')?.url ?? 'https://sfvga.org/membership'} />
          </Card>
          <Card>
            <SectionHeader title="Contact the board" />
            <OpenLink label="Email sfvgabod@gmail.com" url="mailto:sfvgabod@gmail.com" />
          </Card>
          <Card>
            <SectionHeader title="Association documents" />
            <OpenLink label="Association by-laws" url={resources.find((item) => item.id === 'bylaws')?.url ?? 'https://sfvga.org'} />
            {records.filter((item) => item.group === 'minutes').slice(0, 5).map((item) => (
              <OpenLink key={item.id} label={`Meeting minutes · ${item.label}`} url={item.url} />
            ))}
            {records.filter((item) => item.group === 'agm').slice(0, 3).map((item) => (
              <OpenLink key={item.id} label={item.label} url={item.url} />
            ))}
          </Card>
          <Card>
            <SectionHeader title="Common questions" />
            {faqs.map((item) => (
              <View key={item.id}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ expanded: expandedFaq === item.id }}
                  onPress={() => setExpandedFaq(expandedFaq === item.id ? null : item.id)}
                  style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                >
                  <Text style={[typography.bodyMedium, { color: colors.brand, flex: 1, fontWeight: '600' }]}>{item.question}</Text>
                  <AppIcon name={expandedFaq === item.id ? 'chevron-up' : 'chevron-down'} color={colors.brand} size={18} />
                </TouchableOpacity>
                {expandedFaq === item.id ? (
                  <Text style={[typography.bodyMedium, { color: colors.textSecondary, paddingBottom: spacing.md }]}>{item.answer}</Text>
                ) : null}
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {topic.key === 'gallery' ? (
        <>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
            Moments shared by the San Fernando Valley Gujarati Association. Tap a photo to view it larger.
          </Text>
          {gallery.map((photo, index) => (
            <TouchableOpacity
              key={photo.id}
              accessibilityRole="button"
              accessibilityLabel={`View community photo ${index + 1}`}
              onPress={() => setSelectedPhoto(index)}
              activeOpacity={0.8}
            >
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <Image
                  source={{ uri: photo.image }}
                  accessibilityLabel={`SFVGA community moment ${index + 1}`}
                  resizeMode="cover"
                  style={{ width: '100%', aspectRatio: 1.5 }}
                />
              </Card>
            </TouchableOpacity>
          ))}
          <Modal visible={selectedPhoto !== null} onRequestClose={() => setSelectedPhoto(null)} animationType="fade">
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.md }}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close photo"
                onPress={() => setSelectedPhoto(null)}
                style={{ minHeight: 52, alignSelf: 'flex-end', justifyContent: 'center' }}
              >
                <Text style={[typography.bodyMedium, { color: colors.brand }]}>Close</Text>
              </TouchableOpacity>
              {selectedPhoto !== null ? (
                <Image
                  source={{ uri: gallery[selectedPhoto].image }}
                  accessibilityLabel={`SFVGA community moment ${selectedPhoto + 1}`}
                  resizeMode="contain"
                  style={{ flex: 1, width: '100%' }}
                />
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Previous photo"
                  disabled={selectedPhoto === null || selectedPhoto === 0}
                  onPress={() => setSelectedPhoto((current) => current === null ? null : Math.max(0, current - 1))}
                  style={{ minHeight: 52, justifyContent: 'center' }}
                >
                  <Text style={[typography.bodyMedium, { color: selectedPhoto === 0 ? colors.textSecondary : colors.brand }]}>Previous</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Next photo"
                  disabled={selectedPhoto === null || selectedPhoto === gallery.length - 1}
                  onPress={() => setSelectedPhoto((current) => current === null ? null : Math.min(gallery.length - 1, current + 1))}
                  style={{ minHeight: 52, justifyContent: 'center' }}
                >
                  <Text style={[typography.bodyMedium, { color: selectedPhoto === gallery.length - 1 ? colors.textSecondary : colors.brand }]}>Next</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Modal>
        </>
      ) : null}
    </ScrollView>
  );
}
