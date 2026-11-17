'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Image from 'next/image';

export function TicketQr({ payload, name }: { payload: string; name: string }) {
  const [image, setImage] = useState('');
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(payload, { width: 240, margin: 4 }).then((url) => {
      if (active) setImage(url);
    });
    return () => {
      active = false;
    };
  }, [payload]);
  // QR data must not be optimized or resampled by the image service.
  return image ? (
    <Image unoptimized src={image} width={240} height={240} alt={`Check-in QR for ${name}`} />
  ) : (
    <p>Preparing QR…</p>
  );
}
