import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from '../useDocumentTitle';

describe('useDocumentTitle', () => {
  beforeEach(() => {
    document.title = 'IrMeeting';
  });

  it('updates document title', () => {
    renderHook(() => useDocumentTitle('Test Page'));
    expect(document.title).toBe('Test Page | IrMeeting');
  });

  it('restores previous title on unmount', () => {
    const original = document.title;
    const { unmount } = renderHook(() => useDocumentTitle('Test Page'));
    unmount();
    expect(document.title).toBe(original);
  });

  it('falls back to app name when title is empty', () => {
    renderHook(() => useDocumentTitle(''));
    expect(document.title).toBe('IrMeeting');
  });
});
