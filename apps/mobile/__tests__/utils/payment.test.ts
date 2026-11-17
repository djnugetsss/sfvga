import { Linking, Platform } from 'react-native';
import {
  closePaymentTab,
  openPaymentLink,
  openPaymentLinkAfterSave,
  reservePaymentTab,
} from '@/utils/payment';

describe('external payment links on web', () => {
  const originalPlatform = Platform.OS;
  const originalWindow = (globalThis as { window?: unknown }).window;
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
    (globalThis as { window?: unknown }).window = originalWindow;
  });

  it('reserves a separate tab before saving, then navigates it to the payment URL', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const replace = jest.fn();
    const tab = {
      opener: {},
      closed: false,
      close: jest.fn(),
      location: { replace },
      document: { title: '', body: { textContent: '' } },
    };
    const open = jest.fn(() => tab);
    (globalThis as { window?: unknown }).window = { open };
    const reserved = reservePaymentTab();
    expect(open).toHaveBeenCalledWith('about:blank', '_blank');
    expect(tab.document.body.textContent).toContain('Saving your registration');
    expect(tab.opener).toBeNull();
    await openPaymentLinkAfterSave('https://example.com/pay', reserved);
    expect(replace).toHaveBeenCalledWith('https://example.com/pay');
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('the saved-signup button opens the same payment URL directly', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const open = jest.fn(() => ({ opener: null }));
    (globalThis as { window?: unknown }).window = { open };
    await openPaymentLink('https://example.com/pay');
    expect(open).toHaveBeenCalledWith('https://example.com/pay', '_blank');
  });

  it('keeps SFVGA open when a browser blocks the payment popup', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const assign = jest.fn();
    (globalThis as { window?: unknown }).window = { open: () => null, location: { assign } };
    expect(reservePaymentTab()).toBeNull();
    await expect(openPaymentLinkAfterSave('https://example.com/pay')).rejects.toThrow('blocked');
    expect(assign).not.toHaveBeenCalled();
  });

  it('closes a reserved tab if saving the signup fails', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const tab = { opener: null, closed: false, close: jest.fn(), location: { replace: jest.fn() } };
    (globalThis as { window?: unknown }).window = { open: () => tab };
    closePaymentTab(reservePaymentTab());
    expect(tab.close).toHaveBeenCalledTimes(1);
  });
});

describe('external payment links on phones', () => {
  const originalPlatform = Platform.OS;
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
    jest.restoreAllMocks();
  });

  it.each(['ios', 'android'])('hands the payment URL to %s for app-link handling', async (os) => {
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await openPaymentLinkAfterSave('https://example.com/pay');
    await openPaymentLink('https://example.com/pay');
    expect(open).toHaveBeenNthCalledWith(1, 'https://example.com/pay');
    expect(open).toHaveBeenNthCalledWith(2, 'https://example.com/pay');
  });
});
