'use client';

import { PageHeader } from '@/components/common/PageHeader';
import { AccountProfileForms } from '@/components/common/AccountProfileForms';

export default function MemberProfilePage() {
  return (
    <div>
      <PageHeader
        title="Profile"
        description="Update your personal information and password"
      />
      <AccountProfileForms />
    </div>
  );
}
