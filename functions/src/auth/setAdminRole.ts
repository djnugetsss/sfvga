import { onCall } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { setAdminRoleSchema } from '@sfvga/shared-validation';
import { requireSuperAdmin } from '../shared/adminAccess';
import { seedDefaultAdminRoles } from './adminRoles';
import { writeAdminAudit } from '../shared/adminAudit';

/**
 * Legacy compatibility adapter. New clients use adminRoles_assign. Editable organization
 * permissions live in Firestore; only the protected Super Admin marker remains a claim.
 */
export const auth_setAdminRole = onCall(async (request) => {
  const uid = await requireSuperAdmin(request);
  const { targetUid, adminLevel } = setAdminRoleSchema.parse(request.data);
  await seedDefaultAdminRoles(uid);

  if (adminLevel === 'super') {
    const target = await getAuth().getUser(targetUid);
    await getAuth().setCustomUserClaims(targetUid, {
      ...(target.customClaims ?? {}),
      superAdmin: true,
    });
  } else {
    await getFirestore()
      .doc(`organizationAdminGrants/${targetUid}`)
      .set(
        {
          userId: targetUid,
          roleId: `${adminLevel}-admin`,
          grantedBy: uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
  }
  await writeAdminAudit(uid, 'adminRoles.legacyAssign', { targetUid, adminLevel });
  return { success: true };
});
