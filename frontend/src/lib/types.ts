export type Role = 'PLATFORM_ADMIN' | 'ORG_ADMIN' | 'MEMBER';

export type UserStatus = 'ACTIVE' | 'DISABLED' | 'PENDING';

export type OrgStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'TRIAL' | 'PENDING';

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'PENDING'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

export type TransactionStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED'
  | 'ROLLED_BACK';

export type PlanInterval = 'MONTHLY' | 'YEARLY';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  code?: string;
  data?: T;
  details?: unknown;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string | null;
  status: UserStatus;
  organization?: {
    id: string;
    name: string;
    status: OrgStatus;
  } | null;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  interval: PlanInterval;
  features: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  status: OrgStatus;
  contactEmail?: string | null;
  contactPhone?: string | null;
  billingEmail?: string | null;
  stripeCustomerId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  memberCount?: number;
  planName?: string | null;
  subscriptionStatus?: SubscriptionStatus | null;
  subscriptions?: Subscription[];
  _count?: { users: number };
}

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  planId: string;
  organizationId: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd?: string | null;
  plan: Plan;
  createdAt?: string;
}

export interface Member {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface Payment {
  id: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  stripePaymentIntentId?: string | null;
  createdAt: string;
}

export interface Transaction {
  id: string;
  amountCents: number;
  currency: string;
  status: TransactionStatus;
  type: string;
  organizationId: string;
  createdAt: string;
  organization?: { id: string; name: string };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminStats {
  totalOrganizations: number;
  activeOrganizations: number;
  suspendedOrganizations: number;
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenueCents: number;
  failedPaymentCount: number;
  recentSignups: Array<{
    id: string;
    name: string;
    status: OrgStatus;
    createdAt: string;
  }>;
}

export interface AdminOrgListItem {
  id: string;
  name: string;
  status: OrgStatus;
  memberCount: number;
  planName: string | null;
  signupDate: string;
}

export interface RegisterResponse {
  pendingRegistrationId: string;
  checkoutUrl: string;
  sessionId: string;
  plan: Pick<Plan, 'id' | 'name' | 'priceCents' | 'interval' | 'currency'>;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}
