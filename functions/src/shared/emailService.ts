import nodemailer from 'nodemailer';

const smtpHost = () => process.env.SMTP_HOST?.trim() ?? '';
const smtpPort = () => process.env.SMTP_PORT?.trim() || '587';
const smtpUser = () => process.env.SMTP_USER ?? '';
const smtpPass = () => process.env.SMTP_PASS ?? '';
const emailFrom = () => process.env.EMAIL_FROM || 'SFVGA Tickets <tickets@sfvga.org>';

export type TicketEmailResult = 'sent' | 'skipped_not_configured' | 'failed';

export function isEmailConfigured(): boolean {
  if (process.env.FUNCTIONS_EMULATOR === 'true') return false;
  return smtpHost().length > 0;
}

/**
 * Email a PDF ticket backup to the member (tech design §6, §11). SMTP is optional in dev;
 * when not configured the send is skipped without throwing.
 */
export async function sendTicketConfirmationEmail(options: {
  to: string;
  eventTitle: string;
  pdfBuffer: Buffer;
  filename: string;
}): Promise<TicketEmailResult> {
  if (!isEmailConfigured()) {
    console.info('Ticket email skipped: SMTP_HOST is not configured');
    return 'skipped_not_configured';
  }

  const port = Number.parseInt(smtpPort(), 10) || 587;
  const transporter = nodemailer.createTransport({
    host: smtpHost(),
    port,
    secure: port === 465,
    auth: {
      user: smtpUser(),
      pass: smtpPass(),
    },
  });

  try {
    await transporter.sendMail({
      from: emailFrom(),
      to: options.to,
      subject: `Your tickets for ${options.eventTitle}`,
      text: [
        `You're registered for ${options.eventTitle}.`,
        '',
        'Your tickets are attached as a PDF backup. You can also open them anytime in the SFVGA app.',
      ].join('\n'),
      attachments: [
        {
          filename: options.filename,
          content: options.pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
    return 'sent';
  } catch (error) {
    console.error('Failed to send ticket confirmation email', error);
    return 'failed';
  }
}
