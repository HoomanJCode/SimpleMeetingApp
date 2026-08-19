import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MeetingForm, type MeetingFormSubmitData } from '../MeetingForm';
import type { Tag } from '../../../types';

const tags: Tag[] = [
  { id: 'tag-tech', name: 'Tech Talk', color: '#3b82f6' },
  { id: 'tag-online', name: 'Online', color: '#8b5cf6' },
  { id: 'tag-social', name: 'Social', color: '#ec4899' },
];

describe('MeetingForm tag picker', () => {
  it('renders all available tags as toggleable chips', () => {
    render(<MeetingForm onSubmit={vi.fn()} isLoading={false} error={null} tags={tags} />);

    for (const tag of tags) {
      expect(screen.getByRole('button', { name: tag.name })).toBeInTheDocument();
    }
  });

  it('includes selected tagIds in the submit payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<MeetingForm onSubmit={onSubmit} isLoading={false} error={null} tags={tags} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tech Talk' }));
    fireEvent.click(screen.getByRole('button', { name: 'Online' }));

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0] as MeetingFormSubmitData;
    expect(payload.tagIds).toEqual(['tag-tech', 'tag-online']);
  });

  it('marks initially selected tags as pressed', () => {
    render(
      <MeetingForm
        onSubmit={vi.fn()}
        isLoading={false}
        error={null}
        tags={tags}
        initialTagIds={['tag-social']}
      />
    );

    expect(screen.getByRole('button', { name: 'Social' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Tech Talk' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('removes a tag from the payload when deselected', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <MeetingForm
        onSubmit={onSubmit}
        isLoading={false}
        error={null}
        tags={tags}
        initialTagIds={['tag-tech', 'tag-social']}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tech Talk' }));
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0] as MeetingFormSubmitData;
    expect(payload.tagIds).toEqual(['tag-social']);
  });
});
