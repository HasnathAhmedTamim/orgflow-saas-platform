'use client';

import { PageHeader } from '@/components/common/PageHeader';
import { AccountProfileForms } from '@/components/common/AccountProfileForms';

export default function OrganizationAccountPage() {
  return (
    <div>
      <PageHeader
        title="Profile"
        description="Your personal account settings for this organization"
      />
      <AccountProfileForms />
    </div>
  );
}
