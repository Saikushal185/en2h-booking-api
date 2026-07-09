import { NotInPastConstraint } from './not-in-past.validator';

describe('NotInPastConstraint', () => {
  const constraint = new NotInPastConstraint();

  it('accepts today', () => {
    // Build the date string in local time to match the validator's local-day
    // comparison (avoids a UTC/local off-by-one near midnight).
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(now.getDate()).padStart(2, '0')}`;
    expect(constraint.validate(today)).toBe(true);
  });

  it('accepts a future date', () => {
    expect(constraint.validate('2999-12-31')).toBe(true);
  });

  it('rejects a past date', () => {
    expect(constraint.validate('2000-01-01')).toBe(false);
  });

  it('rejects a non-date string', () => {
    expect(constraint.validate('not-a-date')).toBe(false);
  });
});
