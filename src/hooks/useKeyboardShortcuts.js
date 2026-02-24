import { useEffect } from 'react';

/**
 * Registers global keyboard shortcuts.
 *
 * @param {Array<{key: string, ctrl?: boolean, meta?: boolean, shift?: boolean, action: () => void}>} shortcuts
 *   Each entry describes one shortcut. `ctrl` matches Ctrl on Windows/Linux and Cmd on Mac.
 *
 * Example:
 *   useKeyboardShortcuts([
 *     { key: 'n', ctrl: true, action: () => setShowModal(true) },
 *     { key: '/', ctrl: true, action: () => searchRef.current?.focus() },
 *   ]);
 */
export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = e.target.tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

      for (const shortcut of shortcuts) {
        const ctrlMatch  = shortcut.ctrl  ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey);
        const altMatch   = shortcut.alt   ? e.altKey  : !e.altKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;

        if (e.key === shortcut.key && ctrlMatch && altMatch && shiftMatch) {
          // For plain-key shortcuts, skip when the user is typing in an input
          const isModified = shortcut.ctrl || shortcut.alt || shortcut.shift;
          if (!isModified && isEditable) continue;

          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
