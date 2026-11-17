/**
 * Event thumbnail/flyer prep for the free Spark plan.
 *
 * Firebase Storage requires Blaze billing to even create a bucket. For a nonprofit
 * that wants $0 infra, we compress images in the browser and store them as data URLs
 * on the event document (bannerUrl / flyerUrl). Mobile/admin <Image> already accepts
 * data: URIs. Firestore docs max out at 1 MiB — we keep media well under that.
 */

export type EventMediaKind = 'banner' | 'flyer';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

/** Soft caps so the event doc stays comfortably under Firestore's 1 MiB limit. */
const MAX_OUTPUT_CHARS = {
  banner: 350_000, // ~260 KB binary
  flyer: 700_000, // ~525 KB binary
} as const;

const MAX_INPUT_BYTES = {
  banner: 8 * 1024 * 1024,
  flyer: 12 * 1024 * 1024,
} as const;

// A selected image is processed once. EventForm starts this work immediately
// after selection; Save reuses the same promise instead of compressing again.
const preparedMedia: Record<EventMediaKind, WeakMap<File, Promise<string>>> = {
  banner: new WeakMap(),
  flyer: new WeakMap(),
};

function extensionOf(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() ?? '';
}

function resolveContentType(file: File): string {
  if (file.type === 'image/jpg') return 'image/jpeg';
  if (file.type && IMAGE_TYPES.has(file.type)) return file.type;
  return EXT_MIME[extensionOf(file)] ?? '';
}

export function validateEventMediaFile(file: File, kind: EventMediaKind): string | null {
  if (file.type === 'application/pdf' || extensionOf(file) === 'pdf') {
    return kind === 'flyer'
      ? 'PDF flyers need Firebase Storage (Blaze free tier). For $0 on Spark, upload a JPG/PNG of the flyer instead.'
      : 'Thumbnail must be a JPEG, PNG, or WebP image.';
  }

  const contentType = resolveContentType(file);
  if (!IMAGE_TYPES.has(contentType)) {
    return kind === 'banner'
      ? 'Thumbnail must be a JPEG, PNG, or WebP image.'
      : 'Flyer must be a JPEG, PNG, or WebP image (or enable Firebase Storage for PDFs).';
  }
  if (file.size > MAX_INPUT_BYTES[kind]) {
    return kind === 'banner'
      ? 'Thumbnail must be under 8 MB before compression.'
      : 'Flyer must be under 12 MB before compression.';
  }
  if (file.size === 0) return 'The selected file is empty.';
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image. Try a different JPG or PNG.'));
    };
    img.src = url;
  });
}

function canvasToJpegDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Compress an image file to a JPEG data URL sized for Firestore.
 * Banner (thumbnail) targets a smaller card image; flyer keeps more detail.
 */
export function prepareEventMediaDataUrl(kind: EventMediaKind, file: File): Promise<string> {
  const validationError = validateEventMediaFile(file, kind);
  if (validationError) return Promise.reject(new Error(validationError));
  const cache = preparedMedia[kind];
  const existing = cache.get(file);
  if (existing) return existing;
  const pending = compressEventMediaDataUrl(kind, file);
  cache.set(file, pending);
  void pending.catch(() => cache.delete(file));
  return pending;
}

async function compressEventMediaDataUrl(kind: EventMediaKind, file: File): Promise<string> {
  const img = await loadImage(file);
  const maxEdge = kind === 'banner' ? 1280 : 1800;
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process the image in this browser.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const maxChars = MAX_OUTPUT_CHARS[kind];
  let quality = kind === 'banner' ? 0.72 : 0.78;
  let dataUrl = canvasToJpegDataUrl(canvas, quality);

  while (dataUrl.length > maxChars && quality > 0.4) {
    quality -= 0.08;
    dataUrl = canvasToJpegDataUrl(canvas, quality);
  }

  // Still too big — shrink dimensions and retry.
  if (dataUrl.length > maxChars) {
    const shrink = Math.sqrt(maxChars / dataUrl.length) * 0.92;
    canvas.width = Math.max(1, Math.round(width * shrink));
    canvas.height = Math.max(1, Math.round(height * shrink));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    quality = 0.65;
    dataUrl = canvasToJpegDataUrl(canvas, quality);
    while (dataUrl.length > maxChars && quality > 0.35) {
      quality -= 0.07;
      dataUrl = canvasToJpegDataUrl(canvas, quality);
    }
  }

  if (dataUrl.length > maxChars) {
    throw new Error(
      kind === 'banner'
        ? 'That thumbnail is still too large after compression. Try a simpler photo.'
        : 'That flyer is still too large after compression. Try a smaller image or a screenshot of one page.',
    );
  }

  return dataUrl;
}

/** @deprecated Use prepareEventMediaDataUrl — Storage is optional/Blaze-only. */
export async function uploadEventMedia(
  _eventId: string,
  kind: EventMediaKind,
  file: File,
): Promise<string> {
  return prepareEventMediaDataUrl(kind, file);
}
