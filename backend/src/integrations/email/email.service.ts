import { env } from '../../config/env';
import { EmailProvider } from './email.types';
import { ResendProvider } from './providers/resend.provider';

class EmailService {
  constructor(private readonly provider: EmailProvider = new ResendProvider()) {}

  async sendInvitation(to: string, orgName: string, inviteToken: string) {
    const link = `${env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;
    await this.provider.send({
      to,
      subject: `You're invited to join ${orgName} on OrgFlow`,
      html: `<p>You have been invited to join <strong>${orgName}</strong>.</p><p><a href="${link}">Accept invitation</a></p><p>This link expires in 7 days.</p>`,
      text: `Join ${orgName}: ${link}`,
    });
  }

  async sendPasswordReset(to: string, resetToken: string) {
    const link = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await this.provider.send({
      to,
      subject: 'Reset your OrgFlow password',
      html: `<p>Click to reset your password:</p><p><a href="${link}">Reset password</a></p><p>If you did not request this, ignore this email.</p>`,
      text: `Reset password: ${link}`,
    });
  }

  async sendPaymentSucceeded(to: string, orgName: string, amountLabel: string) {
    await this.provider.send({
      to,
      subject: `Payment successful — ${orgName}`,
      html: `<p>Payment of <strong>${amountLabel}</strong> for <strong>${orgName}</strong> succeeded.</p>`,
    });
  }

  async sendPaymentFailed(to: string, orgName: string) {
    await this.provider.send({
      to,
      subject: `Payment failed — ${orgName}`,
      html: `<p>A payment for <strong>${orgName}</strong> failed. Please retry checkout.</p>`,
    });
  }

  async sendSubscriptionChanged(
    to: string,
    orgName: string,
    action: 'upgraded' | 'downgraded' | 'cancelled',
    planName: string,
  ) {
    await this.provider.send({
      to,
      subject: `Subscription ${action} — ${orgName}`,
      html: `<p>Your subscription for <strong>${orgName}</strong> was ${action} (plan: ${planName}).</p>`,
    });
  }

  async sendSubscriptionExpiringSoon(to: string, orgName: string, endsAt: string) {
    await this.provider.send({
      to,
      subject: `Subscription expiring soon — ${orgName}`,
      html: `<p>Your subscription for <strong>${orgName}</strong> renews/expires on ${endsAt}.</p>`,
    });
  }
}

export const emailService = new EmailService();
