import type { Event } from '@sfvga/shared-types';
import season from './season.json';
import { toDate } from '@/utils/dateFormat';

export { season };
const pacific = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
export function dayOf(date: Date) {
  const parts = pacific.formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}
export function mergeSeason(events: Event[], filter: 'upcoming' | 'past', today = dayOf(new Date())) {
  const rows = events.map(event => ({
    id: event.id, title: event.title, day: dayOf(toDate(event.startAt) ?? new Date(0)),
    location: event.location?.name, image: event.bannerUrl, program: false,
  }));
  const identity = (title: string, day: string) => title.trim().toLowerCase() + day;
  const registered = new Set(rows.map(row => identity(row.title, row.day)));
  for (const event of season) {
    if ((event.startDate >= today) !== (filter === 'upcoming')) continue;
    if (registered.has(identity(event.title, event.startDate))) continue;
    rows.push({ id: event.id, title: event.title, day: event.startDate, location: '', image: undefined, program: true });
  }
  return rows.sort((a,b) => filter === 'past' ? b.day.localeCompare(a.day) : a.day.localeCompare(b.day));
}
