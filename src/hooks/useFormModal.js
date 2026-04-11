import { useState, useCallback } from 'react';

/**
 * Custom hook for managing modal open/close state with an optional editing item.
 * Replaces the repeated pattern of useState(isOpen) + useState(editingItem) + open/close handlers.
 *
 * @returns {{ isOpen, editingItem, openAdd, openEdit, close }}
 */
export function useFormModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const openAdd = useCallback(() => {
    setEditingItem(null);
    setIsOpen(true);
  }, []);

  const openEdit = useCallback((item) => {
    setEditingItem(item);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setEditingItem(null);
  }, []);

  return { isOpen, editingItem, openAdd, openEdit, close };
}
