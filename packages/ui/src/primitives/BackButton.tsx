import { useNavigate } from 'react-router-dom';
import { cn } from '@rentflow/core';
import { ChevronLeftIcon } from '../icons';

/**
 * Where Back goes: 'history' when this tab has an earlier page in the app (React Router's history
 * index > 0), else the fallback path, else nowhere (nothing to show).
 */
export function backTarget(historyIndex: number | undefined, fallback?: string | false): 'history' | string | null {
  if ((historyIndex ?? 0) > 0) return 'history';
  return fallback || null;
}

/** "‹ Back": to the previous page in the app, or to `fallback` when the page was opened directly. */
export function BackButton({ fallback, className }: { fallback?: string | false; className?: string }) {
  const navigate = useNavigate();
  const idx = typeof window !== 'undefined' ? (window.history.state as { idx?: number } | null)?.idx : undefined;
  const target = backTarget(idx, fallback);
  if (target === null) return null;

  return (
    <button
      type="button"
      onClick={() => (target === 'history' ? navigate(-1) : navigate(target))}
      className={cn(
        '-ml-2 inline-flex min-h-touch items-center gap-1 self-start rounded-md border-0 bg-transparent px-2 text-sm font-medium text-brand hover:bg-canvas',
        className,
      )}
    >
      <ChevronLeftIcon />
      Back
    </button>
  );
}
