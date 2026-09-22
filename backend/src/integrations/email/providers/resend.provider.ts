import { Resend } from 'resend';
import { env } from '../../../config/env';
import { EmailMessage, EmailProvider } from '../email.types';

export class ResendProvider implements EmailProvider {
  private client: Resend | null;

  constructor() {
    this.client = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.client) {
      console.info('[email:dev]', message.to, message.subject);
      return;
    }

    await this.client.emails.send({
      from: env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}
