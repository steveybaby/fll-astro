import { describe, it, expect } from 'vitest';
import { buildSignupUrl, SIGNUP_API_URL } from '../signups';

describe('buildSignupUrl', () => {
  it('points at the Apps Script deployment', () => {
    expect(SIGNUP_API_URL).toContain('script.google.com/macros/s/');
  });

  it('sets the action parameter', () => {
    expect(new URL(buildSignupUrl('getSnacks')).searchParams.get('action')).toBe('getSnacks');
  });

  it('passes through meetingDate and kidName using the names Apps Script expects', () => {
    const url = new URL(buildSignupUrl('assignSnack', { meetingDate: '2026-09-06', kidName: 'Ishaan' }));
    expect(url.searchParams.get('action')).toBe('assignSnack');
    expect(url.searchParams.get('meetingDate')).toBe('2026-09-06');
    expect(url.searchParams.get('kidName')).toBe('Ishaan');
  });

  it('passes the status parameter for RSVP updates', () => {
    const url = new URL(buildSignupUrl('update', { meetingDate: '2026-09-06', kidName: 'Luca', status: 'yes' }));
    expect(url.searchParams.get('status')).toBe('yes');
  });

  it('omits parameters that were not supplied', () => {
    expect(new URL(buildSignupUrl('get')).searchParams.has('kidName')).toBe(false);
  });
});
