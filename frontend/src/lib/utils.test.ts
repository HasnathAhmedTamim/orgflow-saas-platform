import { describe, expect, it } from 'vitest';
import { cn, formatCurrency } from './utils';

describe('utils', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('formats currency from cents', () => {
    expect(formatCurrency(1999, 'usd')).toContain('19.99');
  });
});
