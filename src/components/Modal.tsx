import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

export function Modal({ title, eyebrow, onClose, children, wide = false }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, []);
  return <div className="modal-backdrop" onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`modal ${wide ? 'modal-wide' : ''}`}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Escape') { e.preventDefault(); onClose(); }
        if (e.key === 'Tab') {
          const buttons = [...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, [tabindex="0"]') ?? [])];
          if (!buttons.length) { e.preventDefault(); return; }
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (e.shiftKey && (document.activeElement === first || !ref.current?.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && (document.activeElement === last || !ref.current?.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
        }
      }}>
      <header className="modal-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2 id="modal-title">{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup jendela"><Icon name="close" /></button></header>
      <div className="modal-content">{children}</div>
    </div>
  </div>;
}