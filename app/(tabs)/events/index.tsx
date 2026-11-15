import { useRouter } from 'expo-router';

import { ImageCard } from '@/components/site/ImageCard';
import { Section } from '@/components/ui/Section';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ScreenScaffold } from '@/components/ui/ScreenScaffold';
import { TextLink } from '@/components/ui/TextLink';
import { EVENTS_COPY } from '@/constants/content';
import { EVENTS } from '@/constants/events';
import { useTheme } from '@/theme';

/** The static events programme: one picture card per event, each linking to its detail page. */
export default function EventsScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <ScreenScaffold>
      <Section tone="pattern">
        <SectionHeader eyebrow="Events" />
        {EVENTS.map((event) => (
          <ImageCard
            key={event.slug}
            image={event.image}
            imageAlt={event.title}
            tag={event.tag}
            title={event.title}
            meta={{ icon: 'calendar', text: event.dateLabel }}
            body={event.description}
          >
            <TextLink
              label={`${EVENTS_COPY.viewDetails} →`}
              onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.slug } })}
              style={{ marginTop: theme.spacing.xs }}
            />
          </ImageCard>
        ))}
      </Section>
    </ScreenScaffold>
  );
}
