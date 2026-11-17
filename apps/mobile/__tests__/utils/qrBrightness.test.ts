import { Platform } from 'react-native';
import * as Brightness from 'expo-brightness';
import {
  boostBrightnessForQr,
  QR_DISPLAY_BRIGHTNESS,
  restoreBrightnessAfterQr,
} from '@/utils/qrBrightness';

jest.mock('expo-brightness', () => ({
  getBrightnessAsync: jest.fn(),
  setBrightnessAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setSystemBrightnessAsync: jest.fn(),
  restoreSystemBrightnessAsync: jest.fn(),
}));

const originalPlatformOs = Platform.OS;

describe('boostBrightnessForQr', () => {
  beforeEach(() => {
    Platform.OS = originalPlatformOs;
    jest.clearAllMocks();
    (Brightness.getBrightnessAsync as jest.Mock).mockResolvedValue(0.4);
    (Brightness.setBrightnessAsync as jest.Mock).mockResolvedValue(undefined);
  });

  it('uses in-app brightness without requesting permission when it succeeds', async () => {
    const session = await boostBrightnessForQr();

    expect(Brightness.setBrightnessAsync).toHaveBeenCalledWith(QR_DISPLAY_BRIGHTNESS);
    expect(Brightness.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(session).toEqual({ mode: 'in_app', original: 0.4 });
  });

  it('requests Android system brightness only after in-app adjust fails', async () => {
    Platform.OS = 'android';
    (Brightness.setBrightnessAsync as jest.Mock).mockRejectedValueOnce(new Error('denied'));
    (Brightness.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
    (Brightness.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Brightness.setSystemBrightnessAsync as jest.Mock).mockResolvedValue(undefined);

    const session = await boostBrightnessForQr();

    expect(Brightness.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Brightness.setSystemBrightnessAsync).toHaveBeenCalledWith(QR_DISPLAY_BRIGHTNESS);
    expect(session.mode).toBe('system');
  });

  it('skips gracefully when permission is denied', async () => {
    Platform.OS = 'android';
    (Brightness.setBrightnessAsync as jest.Mock).mockRejectedValueOnce(new Error('denied'));
    (Brightness.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    const session = await boostBrightnessForQr();

    expect(Brightness.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Brightness.setSystemBrightnessAsync).not.toHaveBeenCalled();
    expect(session.mode).toBe('skipped');
  });
});

describe('restoreBrightnessAfterQr', () => {
  beforeEach(() => {
    Platform.OS = originalPlatformOs;
    jest.clearAllMocks();
  });
  it('restores the saved in-app brightness level', async () => {
    await restoreBrightnessAfterQr({ mode: 'in_app', original: 0.55 });

    expect(Brightness.setBrightnessAsync).toHaveBeenCalledWith(0.55);
  });

  it('uses Android system restore when system brightness was boosted', async () => {
    Platform.OS = 'android';
    await restoreBrightnessAfterQr({ mode: 'system', original: 0.55 });

    expect(Brightness.restoreSystemBrightnessAsync).toHaveBeenCalledTimes(1);
  });
});
