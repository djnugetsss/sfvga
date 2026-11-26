import React, { useState } from 'react';
import { ScrollView, Image, Linking, View, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { season } from '@/content/community/season';
import { useTheme } from '@/providers/ThemeProvider';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import Button from '@/components/ui/Button';
import { formatEventDate } from '@/utils/dateFormat';
import type { EventStackParamList } from '@/navigation/EventStack';

const photos: Record<string, number[]> = {
  'rammat-gammat': [require('../../../assets/partner/sfvga-volleyball.jpg')],
  'saagar-kinare-kalrav': [require('../../../assets/partner/sfvga-beach-day.jpg')],
  'sanskriti-divas': [
    require('../../../assets/partner/dance0.jpg'), require('../../../assets/partner/dance1.jpg'),
    require('../../../assets/partner/dance2.jpg'), require('../../../assets/partner/dance3.jpg'),
    require('../../../assets/partner/dance4.jpg'),
  ],
};

export default function SeasonDetail({ route, navigation }: NativeStackScreenProps<EventStackParamList, 'SeasonDetail'>) {
  const { colors, spacing, typography } = useTheme();
  const event = season.find(item => item.id === route.params.eventId);
  const [index, setIndex] = useState(0);
  if (!event) return <Button title="Back to events" onPress={() => navigation.navigate('EventList')} />;
  const images = photos[event.id] ?? [];
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ width: '100%', maxWidth: 740, alignSelf: 'center', padding: spacing.lg, gap: spacing.md }}>
      <ScreenHeader eyebrow={event.category} title={event.title} subtitle={formatEventDate(new Date(event.startDate + 'T12:00:00'))} />
      {images.length > 0 && <Image source={images[index % images.length]} accessibilityLabel={event.title} style={{ width: '100%', aspectRatio: 1.6, borderRadius: 16 }} />}
      {images.length > 1 && <View><Text style={[typography.caption, { color: colors.textSecondary }]}>Photo {index + 1} of {images.length}</Text><Button variant="text" title="Next photo" onPress={() => setIndex((index + 1) % images.length)} /></View>}
      <Button title="View event on SFVGA.org" onPress={() => void Linking.openURL(event.sourceUrl)} />
    </ScrollView>
  );
}
