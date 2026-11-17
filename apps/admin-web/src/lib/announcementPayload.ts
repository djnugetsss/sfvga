export interface AnnouncementRequest {
  title: string;
  body: string;
  eventId?: string;
}

/** Firebase callable payloads must omit optional values instead of sending `undefined`. */
export function buildAnnouncementRequest({
  title,
  body,
  eventId,
}: AnnouncementRequest): AnnouncementRequest {
  return {
    title,
    body,
    ...(eventId ? { eventId } : {}),
  };
}
