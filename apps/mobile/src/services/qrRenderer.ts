// Maps a stored encrypted payload string to the props react-native-qrcode-svg needs.
// Display only — the client never decrypts the payload (tech design §8). The default
// pure black-on-white is deliberate: QR scanners read the highest-contrast code most
// reliably, so these are intentionally not themed tokens.

export interface QrRenderOptions {
  size?: number;
  backgroundColor?: string;
  color?: string;
}

export function getQrRenderProps(payload: string, options: QrRenderOptions = {}) {
  const { size = 280, backgroundColor = '#FFFFFF', color = '#000000' } = options;

  return {
    value: payload,
    size,
    backgroundColor,
    color,
  };
}
