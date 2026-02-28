import { useEffect, useCallback } from 'react';

interface KeyboardShortcutOptions {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  preventDefault?: boolean;
  enabled?: boolean;
}

/**
 * Custom hook for keyboard shortcuts
 * @param options - Keyboard shortcut configuration
 * @param callback - Function to execute when shortcut is triggered
 */
export function useKeyboardShortcut(
  options: KeyboardShortcutOptions,
  callback: () => void
): void {
  const { key, ctrl, shift, alt, meta, preventDefault = true, enabled = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const matchesKey = event.key.toLowerCase() === key.toLowerCase();
      const matchesCtrl = ctrl ? event.ctrlKey : !event.ctrlKey;
      const matchesShift = shift ? event.shiftKey : !event.shiftKey;
      const matchesAlt = alt ? event.altKey : !event.altKey;
      const matchesMeta = meta ? event.metaKey : !event.metaKey;

      if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback();
      }
    },
    [key, ctrl, shift, alt, meta, preventDefault, enabled, callback]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleKeyDown, enabled]);
}

/**
 * Hook for managing multiple keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: Array<{ options: KeyboardShortcutOptions; callback: () => void }>
): void {
  shortcuts.forEach(({ options, callback }) => {
    useKeyboardShortcut(options, callback);
  });
}
