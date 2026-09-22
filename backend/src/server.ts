import { createApp } from './app';
import { env } from './config/env';
import { sendExpiringSubscriptionReminders } from './jobs/subscription-reminders';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`OrgFlow API listening on ${env.BACKEND_URL} (port ${env.PORT})`);

  const DAY_MS = 24 * 60 * 60 * 1000;
  void sendExpiringSubscriptionReminders().catch((err) =>
    console.error('Subscription reminder job failed', err),
  );
  setInterval(() => {
    void sendExpiringSubscriptionReminders().catch((err) =>
      console.error('Subscription reminder job failed', err),
    );
  }, DAY_MS);
});
