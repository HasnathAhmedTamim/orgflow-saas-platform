import { Resend } from 'resend';
import { env } from '../../../config/env';
import { EmailMessage, EmailProvider } from '../email.types';

export class ResendProvider implements EmailProvider {
  private client: Resend | null;

  constructor() {
    this.client = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  }

  async send(message: EmailMessage): Promise<void> {
    const override = env.EMAIL_DEV_OVERRIDE_TO?.trim();
    const to = override || message.to;
    const subject = override
      ? `[to:${message.to}] ${message.subject}`
      : message.subject;

    if (!this.client) {
      this.logDev({ ...message, to, subject }, 'Resend API key not set');
      return;
    }

    try {
      const result = await this.client.emails.send({
        from: env.EMAIL_FROM,
        to,
        subject,
        html: message.html,
        text: message.text,
      });

      if (result && 'error' in result && result.error) {
        this.logDev({ ...message, to, subject }, String(result.error.message ?? result.error));
        return;
      }

      console.info('[email:sent]', { intended: message.to, deliveredTo: to, subject });
    } catch (err) {
      this.logDev(
        { ...message, to, subject },
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  private logDev(message: EmailMessage, reason: string) {
    console.info('────────────────────────────────────────');
    console.info('[email:fallback]', reason);
    console.info('To:', message.to);
    console.info('Subject:', message.subject);
    if (message.text) {
      console.info('Body:', message.text);
    }
    console.info('────────────────────────────────────────');
  }
}
