import { useCallback, useEffect, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getFirestoreDb } from '@/services/firebase';
import { useAuthContext } from '@/providers/AuthProvider';

type PrefKey = 'announcements' | 'eventReminders';

interface NotificationPrefsState {
  announcements: boolean;
  eventReminders: boolean;
}

const DEFAULT_PREFS: NotificationPrefsState = { announcements: true, eventReminders: true };

/**
 * Read/write the member's `users/{uid}.notificationPrefs` (UI/UX §11). Toggles save instantly
 * (no Save button); each change is applied optimistically and reverts with an inline message
 * if the write fails, per the spec's "Couldn't save — try again" behavior. State mirrors the
 * live user document streamed by AuthProvider.
 */
export function useNotificationPrefs() {
  const { firebaseUser, userProfile } = useAuthContext();
  const uid = firebaseUser?.uid;
  const serverAnnouncements = userProfile?.notificationPrefs?.announcements;
  const serverEventReminders = userProfile?.notificationPrefs?.eventReminders;

  const [prefs, setPrefs] = useState<NotificationPrefsState>(DEFAULT_PREFS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (serverAnnouncements !== undefined && serverEventReminders !== undefined) {
      setPrefs({ announcements: serverAnnouncements, eventReminders: serverEventReminders });
    }
  }, [serverAnnouncements, serverEventReminders]);

  const toggle = useCallback(
    async (key: PrefKey, value: boolean) => {
      if (!uid) return;
      const previous = prefs;
      setPrefs((current) => ({ ...current, [key]: value }));
      setError(null);
      try {
        await updateDoc(doc(getFirestoreDb(), 'users', uid), {
          [`notificationPrefs.${key}`]: value,
          updatedAt: serverTimestamp(),
        });
      } catch {
        setPrefs(previous);
        setError("Couldn't save — try again.");
      }
    },
    [uid, prefs],
  );

  return {
    announcements: prefs.announcements,
    eventReminders: prefs.eventReminders,
    isLoading: !userProfile,
    error,
    toggleAnnouncements: (value: boolean) => toggle('announcements', value),
    toggleEventReminders: (value: boolean) => toggle('eventReminders', value),
  };
}
