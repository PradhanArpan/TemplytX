import { useEffect } from 'react';
import type { RefObject } from 'react';

/** Closes an open popover/dropdown when the user clicks anywhere outside the
 *  given container refs (e.g. the trigger button and the portal panel). */
export function useClickOutside(
  active: boolean,
  refs: RefObject<HTMLElement | null>[],
  onClose: () => void,
) {
  useEffect(() => {
    if (!active) return;
    function onMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (refs.some((r) => r.current?.contains(target))) return;
      onClose();
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
