import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Timestamp, collection, doc, getDoc, getDocs } from 'firebase/firestore';
import type { Event, EventStatus } from '@sfvga/shared-types';
import { type EventCreateInput } from '@sfvga/shared-validation';
import { getFirebaseAuth, getFirestoreDb } from '@/services/firebase';
import { prepareEventMediaDataUrl } from '@/lib/uploadEventMedia';
import { functionsClient } from '@/services/functionsClient';

/** Drop undefined so Firestore updateDoc never rejects nested undefined values. */
function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) continue;
    if (
      entry &&
      typeof entry === 'object' &&
      !Array.isArray(entry) &&
      !(entry instanceof Timestamp)
    ) {
      const proto = Object.getPrototypeOf(entry);
      if (proto === Object.prototype || proto === null) {
        out[key] = stripUndefined(entry as Record<string, unknown>);
        continue;
      }
    }
    out[key] = entry;
  }
  return out as T;
}

export interface EventMediaChanges {
  bannerFile?: File;
  flyerFile?: File;
  clearBanner?: boolean;
  clearFlyer?: boolean;
}

type MediaPatch = {
  bannerUrl?: string | null;
  flyerUrl?: string | null;
};

/**
 * Compress new images to data URLs (Spark-friendly) or clear them.
 * Omitting unchanged media leaves it intact server-side without uploading it again.
 * No Firebase Storage required.
 */
async function resolveMediaPatch(media: EventMediaChanges | undefined): Promise<MediaPatch> {
  if (!media) return {};

  const patch: MediaPatch = {};

  const [bannerUrl, flyerUrl] = await Promise.all([
    media.bannerFile ? prepareEventMediaDataUrl('banner', media.bannerFile) : undefined,
    media.flyerFile ? prepareEventMediaDataUrl('flyer', media.flyerFile) : undefined,
  ]);

  if (bannerUrl) {
    patch.bannerUrl = bannerUrl;
  } else if (media.clearBanner) {
    patch.bannerUrl = null;
  }

  if (flyerUrl) {
    patch.flyerUrl = flyerUrl;
  } else if (media.clearFlyer) {
    patch.flyerUrl = null;
  }

  return patch;
}

function hasMediaWork(media?: EventMediaChanges): boolean {
  if (!media) return false;
  return Boolean(media.bannerFile || media.flyerFile || media.clearBanner || media.clearFlyer);
}

export interface PhotoAlbumNotifyResult {
  announced: boolean;
  registrantCount: number;
}

/**
 * Post a feed announcement members can see in the app. When Cloud Functions are deployed,
 * `notifications_onOrgAnnouncementCreated` also sends push to registrants for this eventId.
 */
async function notifyPhotoAlbumReady(options: {
  eventId: string;
  eventTitle: string;
}): Promise<PhotoAlbumNotifyResult> {
  const db = getFirestoreDb();
  const registrations = await getDocs(collection(db, 'events', options.eventId, 'registrations'));
  const registrantCount = new Set(
    registrations.docs.map((d) => d.data().userId as string | undefined).filter(Boolean),
  ).size;

  await functionsClient.announcements.send({
    title: `Photos from ${options.eventTitle.slice(0, 90)} are ready`,
    body: 'Event photos are available. Open this event in the SFVGA app and tap “View photo gallery” to open the album.',
    eventId: options.eventId,
  });

  return { announced: true, registrantCount };
}

/** Event configuration is validated by server callables before it is saved. */
export function useEventMutations() {
  const queryClient = useQueryClient();

  // Firestore listeners write the new event data directly into the active cache.
  // Mark inactive queries stale without downloading the same image-heavy docs again.
  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'events'], refetchType: 'none' });

  const createEvent = useMutation({
    mutationFn: async ({
      input,
      media,
    }: {
      input: EventCreateInput;
      media?: EventMediaChanges;
    }) => {
      const mediaPatch = hasMediaWork(media) ? await resolveMediaPatch(media) : {};
      // A removed, never-saved image is omission on create, not a nullable URL.
      const createMedia = Object.fromEntries(
        Object.entries(mediaPatch).filter(([, value]) => value !== null),
      );
      const result = await functionsClient.call<Record<string, unknown>, { eventId: string }>(
        'events_create',
        stripUndefined({ ...input, ...createMedia }),
      );
      const now = Timestamp.now();
      const { startAt, endAt, registrationDeadline, ...details } = input;
      const createdEvent: Event = {
        ...details,
        ...createMedia,
        id: result.eventId,
        startAt: Timestamp.fromDate(new Date(startAt)),
        endAt: Timestamp.fromDate(new Date(endAt)),
        ...(registrationDeadline
          ? { registrationDeadline: Timestamp.fromDate(new Date(registrationDeadline)) }
          : {}),
        status: 'draft',
        createdBy: getFirebaseAuth().currentUser?.uid ?? '',
        createdAt: now,
        updatedAt: now,
      };
      // The server has committed the event. Show it immediately while the
      // Firestore listener catches up with the canonical document.
      queryClient.setQueryData(['admin', 'event', result.eventId], createdEvent);
      queryClient.setQueriesData<Event[]>({ queryKey: ['admin', 'events'] }, (events) =>
        events && !events.some((event) => event.id === result.eventId)
          ? [createdEvent, ...events]
          : events,
      );
      return result.eventId;
    },
    onSuccess: invalidateAll,
  });

  const updateEvent = useMutation({
    mutationFn: async ({
      eventId,
      input,
      media,
    }: {
      eventId: string;
      input: EventCreateInput;
      media?: EventMediaChanges;
    }): Promise<{ photoNotify: PhotoAlbumNotifyResult | null }> => {
      const nextAlbum = input.photoAlbumUrl?.trim() ?? '';
      // Most edits do not add photos. Skip the extra Firestore read in that common path.
      const [previousSnap, mediaPatch] = await Promise.all([
        nextAlbum ? getDoc(doc(getFirestoreDb(), 'events', eventId)) : Promise.resolve(null),
        hasMediaWork(media) ? resolveMediaPatch(media) : Promise.resolve({}),
      ]);
      const previous = previousSnap?.exists() ? (previousSnap.data() as Event) : null;
      const previousAlbum = previous?.photoAlbumUrl?.trim() ?? '';

      await functionsClient.call(
        'events_update',
        stripUndefined({
          ...input,
          eventId,
          ...mediaPatch,
          paymentUrl: input.paymentUrl || null,
          registrationDeadline: input.registrationDeadline || null,
          capacity: input.capacity ?? null,
          photoAlbumUrl: input.photoAlbumUrl || null,
        }),
      );

      // New or changed album link → post an in-app announcement (and push if Functions are live).
      const shouldNotify = Boolean(nextAlbum) && nextAlbum !== previousAlbum;
      if (!shouldNotify) return { photoNotify: null };

      const photoNotify = await notifyPhotoAlbumReady({
        eventId,
        eventTitle: input.title.trim() || previous?.title || 'the event',
      });
      return { photoNotify };
    },
    onSuccess: (_data, variables) => {
      invalidateAll();
      queryClient.invalidateQueries({
        queryKey: ['admin', 'event', variables.eventId],
        refetchType: 'none',
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] });
    },
  });

  const setEventStatus = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: EventStatus }) => {
      await functionsClient.call('events_update', { eventId, status });
    },
    onMutate: async ({ eventId, status }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['admin', 'events'] }),
        queryClient.cancelQueries({ queryKey: ['admin', 'event', eventId] }),
      ]);
      const previousLists = queryClient.getQueriesData<Event[]>({ queryKey: ['admin', 'events'] });
      const eventKey = ['admin', 'event', eventId] as const;
      const previousEvent = queryClient.getQueryData<Event | null>(eventKey);
      queryClient.setQueriesData<Event[]>({ queryKey: ['admin', 'events'] }, (events) =>
        events?.map((event) => (event.id === eventId ? { ...event, status } : event)),
      );
      if (previousEvent) queryClient.setQueryData(eventKey, { ...previousEvent, status });
      return { previousLists, previousEvent };
    },
    onError: (_error, { eventId }, context) => {
      context?.previousLists.forEach(([key, events]) => queryClient.setQueryData(key, events));
      if (context?.previousEvent !== undefined)
        queryClient.setQueryData(['admin', 'event', eventId], context.previousEvent);
    },
    onSuccess: (_data, variables) => {
      invalidateAll();
      queryClient.invalidateQueries({
        queryKey: ['admin', 'event', variables.eventId],
        refetchType: 'none',
      });
    },
  });

  const duplicateEvent = useMutation({
    mutationFn: async (sourceEventId: string) => {
      const result = await functionsClient.call<{ sourceEventId: string }, { eventId: string }>(
        'events_duplicate',
        { sourceEventId },
      );
      return result.eventId;
    },
    onSuccess: invalidateAll,
  });

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      await functionsClient.call<{ eventId: string }, { success: boolean }>('events_delete', {
        eventId,
      });
    },
    onSuccess: (_data, eventId) => {
      invalidateAll();
      queryClient.removeQueries({ queryKey: ['admin', 'event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'eventStaff'] });
    },
  });

  return { createEvent, updateEvent, setEventStatus, duplicateEvent, deleteEvent };
}
