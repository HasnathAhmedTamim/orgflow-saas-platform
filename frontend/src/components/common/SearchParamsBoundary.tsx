'use client';

import { Suspense } from 'react';
import { LoadingState } from './LoadingState';

export function SearchParamsBoundary({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}
