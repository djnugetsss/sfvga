/**
 * The static events programme — the same six entries the web app lists
 * (`src/data/events.js`). The Events tab and event detail read from here
 * instead of the content repository.
 */
export type StaticEvent = {
  /** URL-safe id, used as the `/events/[id]` route param. */
  slug: string;
  title: string;
  /** Overline above the title. */
  tag: string;
  description: string;
  /** Remote image URL. */
  image: string;
  /** Human date, e.g. "September 13, 2026" or "Spring 2026". */
  dateLabel: string;
  location: string;
};

const LOCATION = 'San Fernando Valley';

export const EVENTS: readonly StaticEvent[] = [
  {
    slug: 'sanskriti-divas',
    title: 'Sanskriti Divas',
    tag: 'Flagship Cultural Night',
    description:
      'Our signature evening of Gujarati music, dance, and heritage. Members and guests gather for performances, traditional food, and community celebration.',
    image: 'https://media.base44.com/images/public/6a9ca2f5e4aceea1e9c56b3b/a26f38386_generated_image.png',
    dateLabel: 'September 13, 2026',
    location: LOCATION,
  },
  {
    slug: 'navratri-garba',
    title: 'Navratri & Garba',
    tag: 'Schedule • Venue Rules • Pass Bookings',
    description:
      'Nine nights of Garba and Dandiya Raas. Join hundreds of members dancing under the stars in traditional festive attire. Pass bookings now open.',
    image: 'https://media.base44.com/images/public/6a9ca2f5e4aceea1e9c56b3b/fcc94dcaa_generated_image.png',
    dateLabel: 'October 17, 2026',
    location: LOCATION,
  },
  {
    slug: 'dipotsav-diwali',
    title: 'Dipotsav / Diwali',
    tag: 'Festival of Lights',
    description:
      'The festival of lights — diyas, dhol, rangoli, and community feasts celebrating the triumph of light over darkness.',
    image: 'https://media.base44.com/images/public/6a9ca2f5e4aceea1e9c56b3b/8d8ad67f5_generated_image.png',
    dateLabel: 'November 14, 2026',
    location: LOCATION,
  },
  {
    slug: 'rammat-gammat',
    title: 'Rammat-Gammat',
    tag: 'Sports • Games • Outdoor Picnics',
    description:
      'Sports Day, kite flying, hiking, and family picnics — sharpening sportsmanship for all ages with outdoor fun and games.',
    image: 'https://media.base44.com/images/public/6a9ca2f5e4aceea1e9c56b3b/9c038fad4_generated_image.png',
    dateLabel: 'Spring 2026',
    location: LOCATION,
  },
  {
    slug: 'chalo-manek-chowk',
    title: 'Chalo Manek Chowk',
    tag: 'Food • Music • Street-Style Socials',
    description:
      "A taste of home — street-style food, music, and social gatherings reminiscent of Ahmedabad's famous Manek Chowk.",
    image: 'https://media.base44.com/images/public/6a9ca2f5e4aceea1e9c56b3b/fc5c7eb38_generated_image.png',
    dateLabel: 'Summer 2026',
    location: LOCATION,
  },
  {
    slug: 'event-media-gallery',
    title: 'Event Media Gallery',
    tag: 'Photos • Recap Videos',
    description:
      'Relive the magic — browse past event photos and recap videos from our community celebrations over the years.',
    image: 'https://media.base44.com/images/public/6a9ca2f5e4aceea1e9c56b3b/aaef9c9c3_generated_image.png',
    dateLabel: 'Past Events',
    location: LOCATION,
  },
];

export const getEvent = (slug: string | undefined): StaticEvent | undefined =>
  EVENTS.find((e) => e.slug === slug);
