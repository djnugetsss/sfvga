import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Registration } from '@sfvga/shared-types';
import { functionsClient } from '@/services/functionsClient';

type Draft = { approved: boolean; expectedRevision: number; requestId: string };
export function usePaymentDecisions(eventId: string) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [results, setResults] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const count = Object.keys(drafts).length;
  useEffect(() => {
    if (!count) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const click = (event: MouseEvent) => {
      if (
        (event.target as Element)?.closest?.('a[href]') &&
        !window.confirm('Leave without confirming your payment decisions?')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', click, true);
    };
  }, [count]);
  function select(reg: Registration, approved: boolean) {
    setDrafts((current) => {
      const next = { ...current };
      if (
        (approved && reg.reviewStatus === 'approved') ||
        (!approved && reg.reviewStatus === 'rejected')
      )
        delete next[reg.id];
      else
        next[reg.id] = {
          approved,
          expectedRevision: current[reg.id]?.expectedRevision ?? reg.reviewRevision ?? 0,
          requestId: crypto.randomUUID(),
        };
      return next;
    });
    setResults((r) => ({ ...r, [reg.id]: '' }));
  }
  async function confirm() {
    if (busy) return;
    setBusy(true);
    // One stable request per row permits safe retry of a partially successful confirmation.
    for (const [registrationId, draft] of Object.entries(drafts)) {
      try {
        const response = await functionsClient.call<
          unknown,
          { results: { registrationId: string; ok: boolean; error?: string }[] }
        >('registrations_confirmPayments', {
          eventId,
          requestId: draft.requestId,
          decisions: [
            { registrationId, approved: draft.approved, expectedRevision: draft.expectedRevision },
          ],
        });
        const result = response.results[0];
        setResults((r) => ({
          ...r,
          [registrationId]: result.ok ? 'Saved' : (result.error ?? 'Unable to save.'),
        }));
        if (result.ok)
          setDrafts((current) => {
            const next = { ...current };
            delete next[registrationId];
            return next;
          });
      } catch (error) {
        setResults((r) => ({
          ...r,
          [registrationId]:
            error instanceof Error ? error.message : 'Unable to save. Retry to continue.',
        }));
      }
    }
    await queryClient.invalidateQueries({ queryKey: ['admin', 'registrations', eventId] });
    setBusy(false);
  }
  function discard(registrationId: string) {
    setDrafts((current) => {
      const next = { ...current };
      delete next[registrationId];
      return next;
    });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'registrations', eventId] });
  }
  return { drafts, results, busy, count, select, confirm, discard };
}
