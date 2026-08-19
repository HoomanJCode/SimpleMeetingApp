import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MeetingList } from '../MeetingList';
import type { Tag } from '../../../types';

const tags: Tag[] = [
  { id: 'tag-tech', name: 'Tech Talk', color: '#3b82f6' },
  { id: 'tag-social', name: 'Social', color: '#ec4899' },
];

describe('MeetingList tag filter', () => {
  it('renders the filter chips when tags are provided', () => {
    render(<MeetingList meetings={[]} isLoading={false} error={null} tags={tags} onTagFilter={vi.fn()} />);

    expect(screen.getByText('Filter:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tech Talk' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Social' })).toBeInTheDocument();
  });

  it('calls onTagFilter with the tag id when a chip is clicked', () => {
    const onTagFilter = vi.fn();
    render(<MeetingList meetings={[]} isLoading={false} error={null} tags={tags} onTagFilter={onTagFilter} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tech Talk' }));
    expect(onTagFilter).toHaveBeenCalledWith('tag-tech');
  });

  it('calls onTagFilter with null when the active chip is clicked again', () => {
    const onTagFilter = vi.fn();
    render(
      <MeetingList
        meetings={[]}
        isLoading={false}
        error={null}
        tags={tags}
        activeTagId="tag-tech"
        onTagFilter={onTagFilter}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tech Talk' }));
    expect(onTagFilter).toHaveBeenCalledWith(null);
  });
});
