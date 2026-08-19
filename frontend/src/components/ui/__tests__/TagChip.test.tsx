import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagChip } from '../TagChip';
import type { Tag } from '../../../types';

const tag: Tag = { id: 'tag-tech', name: 'Tech Talk', color: '#3b82f6' };

describe('TagChip', () => {
  it('renders the tag name', () => {
    render(<TagChip tag={tag} />);
    expect(screen.getByText('Tech Talk')).toBeInTheDocument();
  });

  it('renders as a button when onClick is provided', () => {
    const onClick = vi.fn();
    render(<TagChip tag={tag} onClick={onClick} />);

    const chip = screen.getByRole('button', { name: 'Tech Talk' });
    fireEvent.click(chip);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('marks selected chips as pressed', () => {
    render(<TagChip tag={tag} selected onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Tech Talk' })).toHaveAttribute('aria-pressed', 'true');
  });
});
