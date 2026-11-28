import React, { createRef } from 'react';
import { render, act } from '@testing-library/react-native';
import { WebRecaptchaVerifier, type RecaptchaVerifierHandle } from '@/components/auth/RecaptchaVerifierModal';

const mockContainers = new Map<string, unknown>();
const mockIds: string[] = [];
const mockVerify = jest.fn().mockResolvedValue('captcha-token');
const mockClear = jest.fn();
jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('@/services/firebase', () => ({ firebaseConfig: {}, getFirebaseAuth: () => ({}) }));
jest.mock('firebase/auth', () => ({ RecaptchaVerifier: jest.fn().mockImplementation((_auth, id) => {
  mockIds.push(id);
  return { verify: mockVerify, clear: mockClear, _reset: jest.fn() };
}) }));

it('isolates OTP resend from phone entry and leaves phone verification usable after going back', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    getElementById: (id: string) => mockContainers.get(id),
    createElement: () => { const node = { id: '', style: {}, remove: () => mockContainers.delete(node.id) }; return node; },
    body: { appendChild: (node: { id: string }) => mockContainers.set(node.id, node) },
  } });
  const phone = createRef<RecaptchaVerifierHandle>();
  const otp = createRef<RecaptchaVerifierHandle>();
  const phoneScreen = render(<WebRecaptchaVerifier ref={phone} />);
  const otpScreen = render(<WebRecaptchaVerifier ref={otp} />);
  try {
    await act(async () => { await phone.current!.verify(); await otp.current!.verify(); });
    expect(new Set(mockIds).size).toBe(2);
    act(() => otp.current!._reset());
    await act(async () => { await otp.current!.verify(); });
    otpScreen.unmount();
    expect(mockContainers.has(mockIds[0])).toBe(true);
    await act(async () => { await phone.current!.verify(); });
    expect(mockVerify).toHaveBeenCalledTimes(4);
  } finally {
    phoneScreen.unmount();
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
