import { getFirestore, Timestamp, type WriteBatch } from 'firebase-admin/firestore';

export function stageAdminAudit(
  batch: WriteBatch,
  actorUid: string,
  action: string,
  target: Record<string, unknown>,
): void {
  batch.set(getFirestore().collection('adminAuditLogs').doc(), {
    actorUid,
    action,
    target,
    createdAt: Timestamp.now(),
  });
}

export async function writeAdminAudit(
  actorUid: string,
  action: string,
  target: Record<string, unknown>,
): Promise<void> {
  await getFirestore().collection('adminAuditLogs').add({
    actorUid,
    action,
    target,
    createdAt: Timestamp.now(),
  });
}
