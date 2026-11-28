import { sendPhoneOtp, confirmPhoneOtp, clearPendingOtp, otpResendSeconds } from '@/services/authService';
import { signInWithPhoneNumber } from 'firebase/auth';
jest.mock('@/services/firebase', () => ({ getFirebaseAuth: () => ({}), getFirestoreDb: jest.fn() }));
jest.mock('firebase/firestore', () => ({}));
jest.mock('firebase/auth', () => ({ signInWithPhoneNumber: jest.fn() }));
const send = signInWithPhoneNumber as jest.Mock;
const verifier = { type: 'recaptcha', verify: jest.fn() };
beforeEach(() => { clearPendingOtp(); send.mockReset(); });

it('reuses a sent code after returning to the same phone number', async () => {
  const confirm = jest.fn().mockResolvedValue(undefined);
  send.mockResolvedValue({ confirm });
  await sendPhoneOtp('+16505550101', verifier);
  await sendPhoneOtp('+16505550101', verifier);
  expect(send).toHaveBeenCalledTimes(1);
  await confirmPhoneOtp('123456');
  expect(confirm).toHaveBeenCalledWith('123456');
});

it('coalesces concurrent requests for the same number', async () => {
  let finish!: (value: unknown) => void;
  send.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const first = sendPhoneOtp('+16505550102', verifier);
  const second = sendPhoneOtp('+16505550102', verifier);
  finish({ confirm: jest.fn() });
  await Promise.all([first, second]);
  expect(send).toHaveBeenCalledTimes(1);
});

it('keeps the existing code usable after Firebase throttles a resend', async () => {
  const clock = jest.spyOn(Date, 'now');
  clock.mockReturnValue(100000);
  const confirm = jest.fn().mockResolvedValue(undefined);
  send.mockResolvedValueOnce({ confirm });
  await sendPhoneOtp('+16505550103', verifier);
  clock.mockReturnValue(131000);
  send.mockRejectedValueOnce({ code: 'auth/too-many-requests' });
  await expect(sendPhoneOtp('+16505550103', verifier, true)).rejects.toMatchObject({ code: 'auth/too-many-requests' });
  expect(otpResendSeconds('+16505550103')).toBe(60);
  await expect(sendPhoneOtp('+16505550103', verifier, true)).rejects.toThrow('Please wait');
  await confirmPhoneOtp('123456');
  expect(confirm).toHaveBeenCalledWith('123456');
  expect(send).toHaveBeenCalledTimes(2);
  clock.mockRestore();
});
