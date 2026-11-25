'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  eventCreateSchema,
  normalizeEventPricing,
  type EventCreateInput,
} from '@sfvga/shared-validation';
import type { Event } from '@sfvga/shared-types';
import { Field, Input, Textarea, Card, ErrorBanner } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { toDate, toDateTimeLocalValue, pacificInputToIso } from '@/lib/formatters';
import type { EventMediaChanges } from '@/hooks/useEventMutations';
import { prepareEventMediaDataUrl, validateEventMediaFile } from '@/lib/uploadEventMedia';

interface FaqRow {
  question: string;
  answer: string;
}

interface FormState {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  locationName: string;
  locationAddress: string;
  capacity: string;
  registrationDeadline: string;
  paymentUrl: string;
  priceMember: string;
  priceGuest: string;
  childPricingEnabled: boolean;
  childMaxAge: string;
  priceChild: string;
  parkingNote: string;
  whatToBring: string;
  schedule: string;
  photoAlbumUrl: string;
  faqs: FaqRow[];
}

function initialState(event?: Event | null): FormState {
  const start = event ? toDate(event.startAt) : null;
  const end = event ? toDate(event.endAt) : null;
  const deadline = event?.registrationDeadline ? toDate(event.registrationDeadline) : null;
  const pricing = normalizeEventPricing(
    event?.pricing as Parameters<typeof normalizeEventPricing>[0],
  );
  return {
    title: event?.title ?? '',
    description: event?.description ?? '',
    startAt: start ? toDateTimeLocalValue(start) : '',
    endAt: end ? toDateTimeLocalValue(end) : '',
    locationName: event?.location?.name ?? '',
    locationAddress: event?.location?.address ?? '',
    capacity: event?.capacity != null ? String(event.capacity) : '',
    registrationDeadline: deadline ? toDateTimeLocalValue(deadline) : '',
    paymentUrl: event?.paymentUrl ?? '',
    priceMember: String(pricing.member),
    priceGuest: String(pricing.guest),
    childPricingEnabled: Boolean(pricing.childRule),
    childMaxAge: String(pricing.childRule?.maxAgeInclusive ?? 5),
    priceChild: String(pricing.childRule?.price ?? 0),
    parkingNote: event?.parkingNote ?? '',
    whatToBring: event?.whatToBring ?? '',
    schedule: event?.schedule ?? '',
    photoAlbumUrl: event?.photoAlbumUrl ?? '',
    faqs: event?.faqs?.length ? event.faqs.map((f) => ({ ...f })) : [],
  };
}

/** Parse a datetime-local string into an ISO string; empty stays undefined. */
function toIso(local: string): string | undefined {
  if (!local) return undefined;
  return pacificInputToIso(local);
}

function isImagePreviewUrl(url: string): boolean {
  return url.startsWith('blob:') || url.startsWith('data:image/') || /^https?:\/\//i.test(url);
}

/** Media picker — uses a div (not Field's <label>) so clicks don't open the file dialog. */
function MediaPickerField({
  label,
  hint,
  error,
  previewUrl,
  emptyLabel,
  accept,
  onPick,
  onRemove,
  objectFit = 'cover',
}: {
  label: string;
  hint: string;
  error?: string;
  previewUrl: string | null;
  emptyLabel: string;
  accept: string;
  onPick: (file: File | undefined) => void;
  onRemove: () => void;
  objectFit?: 'cover' | 'contain';
}) {
  const inputId = `media-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const showImage = previewUrl != null && isImagePreviewUrl(previewUrl);
  const showPdfPlaceholder = previewUrl != null && !showImage;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-deepBlue">{label}</span>
      {showImage ? (
        <div className="mb-3 overflow-hidden rounded-lg border border-warmGray400/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={`${label} preview`}
            className={`h-48 w-full bg-warmGray50 ${objectFit === 'cover' ? 'object-cover' : 'object-contain'}`}
          />
        </div>
      ) : showPdfPlaceholder ? (
        <div className="mb-3 flex h-48 flex-col items-center justify-center gap-2 rounded-lg border border-warmGray400/20 bg-warmGray50 px-3 text-center text-sm text-deepBlue">
          <span className="font-medium">PDF on file</span>
          <span className="text-sm text-warmGray400">
            Saved — replace with an image to preview here
          </span>
        </div>
      ) : (
        <div className="mb-3 flex h-48 items-center justify-center rounded-lg border border-dashed border-warmGray400/30 bg-warmGray50 text-sm text-warmGray400">
          {emptyLabel}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={inputId}
          className="inline-flex cursor-pointer items-center rounded-md border border-warmGray400/30 bg-white px-3 py-2 text-sm font-medium text-deepBlue hover:bg-warmGray50"
        >
          {previewUrl ? 'Replace' : 'Upload'}
        </label>
        <input
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            onPick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {previewUrl ? (
          <Button type="button" variant="secondary" size="sm" onClick={onRemove}>
            Remove
          </Button>
        ) : null}
      </div>
      {hint && !error ? <span className="text-sm text-warmGray400">{hint}</span> : null}
      {error ? <span className="text-sm text-error">{error}</span> : null}
    </div>
  );
}

export interface EventFormSubmitPayload {
  input: EventCreateInput;
  media: EventMediaChanges;
}

interface EventFormProps {
  event?: Event | null;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (payload: EventFormSubmitPayload) => void | Promise<void>;
}

export function EventForm({
  event,
  submitting,
  submitLabel = 'Save event',
  onSubmit,
}: EventFormProps) {
  const [state, setState] = useState<FormState>(() => initialState(event));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(event?.bannerUrl ?? null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(event?.flyerUrl ?? null);
  const [clearBanner, setClearBanner] = useState(false);
  const [clearFlyer, setClearFlyer] = useState(false);

  useEffect(() => {
    if (!bannerFile) return;
    const url = URL.createObjectURL(bannerFile);
    setBannerPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [bannerFile]);

  useEffect(() => {
    if (!flyerFile) return;
    if (flyerFile.type === 'application/pdf') {
      setFlyerPreview(flyerFile.name);
      return;
    }
    const url = URL.createObjectURL(flyerFile);
    setFlyerPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [flyerFile]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const number = (value: string): number | undefined => {
    if (value.trim() === '') return undefined;
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  };

  const candidate: EventCreateInput = useMemo(
    () => ({
      title: state.title.trim(),
      description: state.description.trim(),
      paymentUrl: state.paymentUrl.trim() || undefined,
      startAt: toIso(state.startAt) ?? '',
      endAt: toIso(state.endAt) ?? '',
      location: {
        name: state.locationName.trim(),
        address: state.locationAddress.trim(),
        // Coords are not collected in the form; keep existing values on edit.
        lat: event?.location?.lat ?? 0,
        lng: event?.location?.lng ?? 0,
      },
      parkingNote: state.parkingNote.trim() || undefined,
      whatToBring: state.whatToBring.trim() || undefined,
      schedule: state.schedule.trim() || undefined,
      photoAlbumUrl: state.photoAlbumUrl.trim() || undefined,
      faqs: state.faqs
        .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
        .filter((f) => f.question && f.answer),
      capacity: number(state.capacity),
      registrationDeadline: toIso(state.registrationDeadline),
      pricing: {
        member: number(state.priceMember) ?? 0,
        guest: number(state.priceGuest) ?? 0,
        ...(state.childPricingEnabled
          ? {
              childRule: {
                maxAgeInclusive: number(state.childMaxAge) ?? 5,
                price: number(state.priceChild) ?? 0,
              },
            }
          : {}),
      },
    }),
    [state, event],
  );

  const onBannerPick = (file: File | undefined) => {
    if (!file) return;
    const err = validateEventMediaFile(file, 'banner');
    if (err) {
      setErrors((e) => ({ ...e, bannerUrl: err }));
      return;
    }
    setErrors((e) => {
      const next = { ...e };
      delete next.bannerUrl;
      return next;
    });
    setBannerFile(file);
    setClearBanner(false);
    void prepareEventMediaDataUrl('banner', file).catch(() => {
      // Save will surface a processing error if this selected file cannot be read.
    });
  };

  const onFlyerPick = (file: File | undefined) => {
    if (!file) return;
    const err = validateEventMediaFile(file, 'flyer');
    if (err) {
      setErrors((e) => ({ ...e, flyerUrl: err }));
      return;
    }
    setErrors((e) => {
      const next = { ...e };
      delete next.flyerUrl;
      return next;
    });
    setFlyerFile(file);
    setClearFlyer(false);
    void prepareEventMediaDataUrl('flyer', file).catch(() => {
      // Save will surface a processing error if this selected file cannot be read.
    });
  };

  const removeBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    setClearBanner(Boolean(event?.bannerUrl));
  };

  const removeFlyer = () => {
    setFlyerFile(null);
    setFlyerPreview(null);
    setClearFlyer(Boolean(event?.flyerUrl));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = eventCreateSchema.safeParse(candidate);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || 'form';
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      // Friendlier messages for the two most common mistakes.
      if (candidate.startAt === '') nextErrors.startAt = 'Start date and time is required';
      if (candidate.endAt === '') nextErrors.endAt = 'End date and time is required';
      if (state.photoAlbumUrl.trim() && !nextErrors.photoAlbumUrl) {
        nextErrors.photoAlbumUrl = 'Enter a full https:// link (Google Photos, OneDrive, etc.).';
      }
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    await onSubmit({
      input: result.data,
      media: {
        ...(bannerFile ? { bannerFile } : {}),
        ...(flyerFile ? { flyerFile } : {}),
        ...(clearBanner ? { clearBanner: true } : {}),
        ...(clearFlyer ? { clearFlyer: true } : {}),
      },
    });
  };

  const otherErrors = Object.entries(errors).filter(
    ([key]) =>
      ![
        'title',
        'description',
        'startAt',
        'endAt',
        'bannerUrl',
        'flyerUrl',
        'photoAlbumUrl',
      ].includes(key),
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {otherErrors.length > 0 ? (
        <ErrorBanner message="Please fix the highlighted fields below before saving." />
      ) : null}

      <Card>
        <div className="flex flex-col gap-4">
          <Field label="Title" error={errors.title}>
            <Input value={state.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Description" error={errors.description}>
            <Textarea
              rows={4}
              value={state.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts (Pacific time)" error={errors.startAt}>
              <Input
                type="datetime-local"
                value={state.startAt}
                onChange={(e) => set('startAt', e.target.value)}
              />
            </Field>
            <Field label="Ends (Pacific time)" error={errors.endAt}>
              <Input
                type="datetime-local"
                value={state.endAt}
                onChange={(e) => set('endAt', e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 font-semibold text-deepBlue">Media</h3>
        <p className="mb-4 text-sm text-warmGray400">
          Images are compressed and saved with the event (free — no Firebase Storage needed).
          Thumbnail shows on cards and event details. Flyer is what members open from the event
          page. Use a JPG/PNG of the flyer (screenshot or export), not a PDF.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <MediaPickerField
            label="Thumbnail"
            hint="JPEG, PNG, or WebP"
            error={errors.bannerUrl}
            previewUrl={bannerPreview}
            emptyLabel="No thumbnail"
            accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp"
            objectFit="cover"
            onPick={onBannerPick}
            onRemove={removeBanner}
          />
          <MediaPickerField
            label="Flyer"
            hint="JPEG, PNG, or WebP of the flyer"
            error={errors.flyerUrl}
            previewUrl={flyerPreview}
            emptyLabel="No flyer"
            accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp"
            objectFit="contain"
            onPick={onFlyerPick}
            onRemove={removeFlyer}
          />
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 font-semibold text-deepBlue">Photo gallery (after the event)</h3>
        <p className="mb-4 text-sm text-warmGray400">
          Paste a Google Photos, OneDrive, or any shared album link. Members see a &quot;View photo
          gallery&quot; button on the event. Saving a new or changed link posts an in-app
          announcement. Phone push alerts need Cloud Functions deployed and the member to have
          notifications turned on in the app.
        </p>
        <Field label="Album link" error={errors.photoAlbumUrl} hint="Must start with https://">
          <Input
            type="url"
            inputMode="url"
            placeholder="https://photos.google.com/share/… or OneDrive link"
            value={state.photoAlbumUrl}
            onChange={(e) => set('photoAlbumUrl', e.target.value)}
          />
        </Field>
        {state.photoAlbumUrl.trim() ? (
          <button
            type="button"
            className="mt-2 self-start text-sm font-medium text-error"
            onClick={() => set('photoAlbumUrl', '')}
          >
            Clear album link
          </button>
        ) : null}
      </Card>

      <Card>
        <h3 className="mb-4 font-semibold text-deepBlue">Location</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Venue name" error={errors['location.name']}>
            <Input
              value={state.locationName}
              onChange={(e) => set('locationName', e.target.value)}
            />
          </Field>
          <Field label="Address" error={errors['location.address']}>
            <Input
              value={state.locationAddress}
              onChange={(e) => set('locationAddress', e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-semibold text-deepBlue">Pricing & capacity</h3>
        <p className="mb-4 text-sm text-warmGray400">
          Member and guest (non-member) fees. Enter 0 for free. Optional child pricing covers ages
          that vary by event — for &quot;under 5&quot; only, enter 4; for &quot;5 and under&quot;,
          enter 5.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Member price ($)" error={errors['pricing.member']}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={state.priceMember}
              onChange={(e) => set('priceMember', e.target.value)}
            />
          </Field>
          <Field label="Guest / non-member price ($)" error={errors['pricing.guest']}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={state.priceGuest}
              onChange={(e) => set('priceGuest', e.target.value)}
            />
          </Field>
          <Field label="Capacity (optional)" error={errors.capacity}>
            <Input
              type="number"
              min="1"
              value={state.capacity}
              onChange={(e) => set('capacity', e.target.value)}
            />
          </Field>
          <Field
            label="Registration closes (Pacific time)"
            error={errors.registrationDeadline}
            hint="Required before publishing a priced event."
          >
            <Input
              type="datetime-local"
              value={state.registrationDeadline}
              onChange={(e) => set('registrationDeadline', e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Payment link"
          error={errors.paymentUrl}
          hint="HTTPS link for Zelle or another payment service. Required for priced events."
        >
          <Input
            type="url"
            value={state.paymentUrl}
            onChange={(e) => set('paymentUrl', e.target.value)}
            placeholder="https://"
          />
        </Field>

        <label className="mt-6 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-warmGray400 text-accentStrong focus:ring-accentStrong"
            checked={state.childPricingEnabled}
            onChange={(e) => set('childPricingEnabled', e.target.checked)}
          />
          <span className="text-sm font-medium text-deepBlue">Special child pricing</span>
        </label>
        {state.childPricingEnabled ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Ages __ and under"
              hint="Inclusive age cutoff"
              error={errors['pricing.childRule.maxAgeInclusive']}
            >
              <Input
                type="number"
                min="0"
                max="21"
                value={state.childMaxAge}
                onChange={(e) => set('childMaxAge', e.target.value)}
              />
            </Field>
            <Field
              label="Child price ($)"
              hint="Use 0 for free"
              error={errors['pricing.childRule.price']}
            >
              <Input
                type="number"
                min="0"
                step="0.01"
                value={state.priceChild}
                onChange={(e) => set('priceChild', e.target.value)}
              />
            </Field>
          </div>
        ) : null}
      </Card>

      <Card>
        <h3 className="mb-4 font-semibold text-deepBlue">Details (optional)</h3>
        <div className="flex flex-col gap-4">
          <Field label="Parking note">
            <Input value={state.parkingNote} onChange={(e) => set('parkingNote', e.target.value)} />
          </Field>
          <Field label="What to bring / dress code">
            <Input value={state.whatToBring} onChange={(e) => set('whatToBring', e.target.value)} />
          </Field>
          <Field label="Schedule" hint="One item per line, e.g. '6:00 Doors open'">
            <Textarea
              rows={3}
              value={state.schedule}
              onChange={(e) => set('schedule', e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-deepBlue">FAQs (optional)</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => set('faqs', [...state.faqs, { question: '', answer: '' }])}
          >
            Add FAQ
          </Button>
        </div>
        {state.faqs.length === 0 ? (
          <p className="text-sm text-warmGray400">No FAQs added.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {state.faqs.map((faq, index) => (
              <div key={index} className="grid gap-2 rounded-lg border border-warmGray400/15 p-3">
                <Input
                  placeholder="Question"
                  value={faq.question}
                  onChange={(e) =>
                    set(
                      'faqs',
                      state.faqs.map((f, i) =>
                        i === index ? { ...f, question: e.target.value } : f,
                      ),
                    )
                  }
                />
                <Textarea
                  rows={2}
                  placeholder="Answer"
                  value={faq.answer}
                  onChange={(e) =>
                    set(
                      'faqs',
                      state.faqs.map((f, i) =>
                        i === index ? { ...f, answer: e.target.value } : f,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="self-end text-sm font-medium text-error"
                  onClick={() =>
                    set(
                      'faqs',
                      state.faqs.filter((_, i) => i !== index),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
