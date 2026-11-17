import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export interface TicketPdfEntry {
  attendeeName: string;
  qrPayloadEncrypted: string;
}

export interface TicketPdfOptions {
  eventTitle: string;
  eventDateLabel: string;
  locationName?: string;
  tickets: TicketPdfEntry[];
}

/** Build a human-readable event date line for PDF tickets and emails. */
export function formatEventDateLabel(startAt: Date, timeZone = 'America/Los_Angeles'): string {
  return startAt.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  });
}

/** Sanitize an event title for use in attachment filenames. */
export function ticketPdfFilename(eventTitle: string): string {
  const slug = eventTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `sfvga-tickets-${slug || 'event'}.pdf`;
}

/**
 * Server-rendered PDF backup with the same encrypted QR strings stored on each Ticket doc
 * (tech design §6 step 7, §8).
 */
export async function buildTicketPdf(options: TicketPdfOptions): Promise<Buffer> {
  const qrImages = await Promise.all(
    options.tickets.map((ticket) =>
      QRCode.toBuffer(ticket.qrPayloadEncrypted, { width: 200, margin: 1, errorCorrectionLevel: 'M' }),
    ),
  );

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 54 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    options.tickets.forEach((ticket, index) => {
      if (index > 0) doc.addPage();

      doc.fontSize(22).fillColor('#1a365d').text('SFVGA Event Ticket', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(18).fillColor('#000000').text(options.eventTitle, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).fillColor('#444444').text(options.eventDateLabel, { align: 'center' });
      if (options.locationName) {
        doc.text(options.locationName, { align: 'center' });
      }
      doc.moveDown(1.5);
      doc.fontSize(16).fillColor('#000000').text(ticket.attendeeName, { align: 'center' });
      doc.moveDown();

      const qrSize = 200;
      const x = (doc.page.width - qrSize) / 2;
      doc.image(qrImages[index], x, doc.y, { width: qrSize, height: qrSize });
      doc.y += qrSize + 16;

      doc.fontSize(10).fillColor('#666666').text('Show this QR code at check-in.', { align: 'center' });
    });

    doc.end();
  });
}
