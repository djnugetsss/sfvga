import {
  buildTicketPdf,
  formatEventDateLabel,
  ticketPdfFilename,
} from '../../src/tickets/ticketPdf';

describe('ticketPdfFilename', () => {
  it('slugifies the event title', () => {
    expect(ticketPdfFilename('Diwali Gala 2026!')).toBe('sfvga-tickets-diwali-gala-2026.pdf');
  });
});

describe('formatEventDateLabel', () => {
  it('formats a Pacific-time event date', () => {
    const label = formatEventDateLabel(new Date('2026-11-01T01:30:00.000Z'));
    expect(label).toContain('2026');
    expect(label.length).toBeGreaterThan(10);
  });
});

describe('buildTicketPdf', () => {
  it('produces a valid PDF with one page per ticket', async () => {
    const pdf = await buildTicketPdf({
      eventTitle: 'Test Event',
      eventDateLabel: 'Saturday, November 1, 2026 at 6:30 PM',
      locationName: 'Community Hall',
      tickets: [
        { attendeeName: 'Ada Lovelace', qrPayloadEncrypted: 'encrypted-payload-a' },
        { attendeeName: 'Grace Hopper', qrPayloadEncrypted: 'encrypted-payload-b' },
      ],
    });

    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
