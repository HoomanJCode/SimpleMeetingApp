import type { Tag } from '../../types';

interface TagChipProps {
  tag: Tag;
  /** When true, the chip renders as a solid (selected) pill. Used by the form picker. */
  selected?: boolean;
  /** When provided, the chip becomes a clickable button (e.g. filter toggles). */
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export function TagChip({ tag, selected = false, onClick, size = 'sm' }: TagChipProps) {
  // Derive a translucent background from the tag's hex color so each chip is
  // visually distinct without needing a per-tag Tailwind class.
  const baseStyle: React.CSSProperties = selected
    ? { backgroundColor: tag.color, color: '#ffffff', borderColor: tag.color }
    : { backgroundColor: `${tag.color}1A`, color: tag.color, borderColor: `${tag.color}40` };

  const sizeClasses = size === 'md' ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs';

  const className = `inline-flex items-center gap-1 rounded-full font-medium border transition-colors ${sizeClasses} ${
    onClick ? 'cursor-pointer select-none hover:brightness-95' : ''
  }`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
        style={baseStyle}
        aria-pressed={selected}
      >
        {tag.name}
      </button>
    );
  }

  return (
    <span className={className} style={baseStyle}>
      {tag.name}
    </span>
  );
}
