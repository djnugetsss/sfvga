'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

export type ActionMenuItem =
  | {
      id: string;
      label: string;
      href: string;
      tone?: 'default' | 'danger';
      disabled?: boolean;
    }
  | {
      id: string;
      label: string;
      onSelect: () => void;
      tone?: 'default' | 'danger';
      disabled?: boolean;
    };

interface ActionMenuProps {
  label: string;
  items: ActionMenuItem[];
  disabled?: boolean;
  align?: 'left' | 'right';
}

interface MenuCoords {
  top: number;
  left: number;
  minWidth: number;
}

/**
 * Compact ⋮ overflow menu for list rows. Renders in a portal with fixed positioning so
 * parent overflow (cards, tables) cannot clip the options.
 */
export function ActionMenu({ label, items, disabled = false, align = 'right' }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = Math.max(184, menuRef.current?.offsetWidth ?? 184);
    const menuHeight = menuRef.current?.offsetHeight ?? items.length * 44 + 8;
    const gap = 4;
    const padding = 8;

    let top = rect.bottom + gap;
    if (top + menuHeight > window.innerHeight - padding) {
      top = Math.max(padding, rect.top - gap - menuHeight);
    }

    let left = align === 'right' ? rect.right - menuWidth : rect.left;
    left = Math.min(left, window.innerWidth - menuWidth - padding);
    left = Math.max(padding, left);

    setCoords({ top, left, minWidth: menuWidth });
  };

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
    // Re-measure after paint so height is accurate for flip-up.
    const frame = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align, items.length]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onReposition = () => updatePosition();

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align, items.length]);

  const close = () => setOpen(false);

  const menu =
    open && coords && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              minWidth: coords.minWidth,
              zIndex: 80,
            }}
            className="overflow-visible rounded-2xl border border-border bg-surface py-1.5 shadow-[0_18px_45px_rgba(68,48,38,0.16)]"
          >
            {items.map((item, index) => {
              const isDanger = item.tone === 'danger';
              const showDivider = isDanger && index > 0 && items[index - 1]?.tone !== 'danger';
              const itemClass = `flex w-full items-center px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                item.disabled
                  ? 'cursor-not-allowed text-muted/70'
                  : isDanger
                    ? 'text-error hover:bg-errorSoft'
                    : 'text-ink hover:bg-accentSoft'
              }`;

              return (
                <React.Fragment key={item.id}>
                  {showDivider ? (
                    <div className="my-1 border-t border-border" role="separator" />
                  ) : null}
                  {'href' in item ? (
                    item.disabled ? (
                      <span role="menuitem" aria-disabled className={itemClass}>
                        {item.label}
                      </span>
                    ) : (
                      <Link role="menuitem" href={item.href} className={itemClass} onClick={close}>
                        {item.label}
                      </Link>
                    )
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={item.disabled}
                      className={itemClass}
                      onClick={() => {
                        if (item.disabled) return;
                        close();
                        item.onSelect();
                      }}
                    >
                      {item.label}
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-brand hover:bg-brandSoft disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex flex-col items-center justify-center gap-[3px]" aria-hidden>
          <span className="block h-1 w-1 rounded-full bg-current" />
          <span className="block h-1 w-1 rounded-full bg-current" />
          <span className="block h-1 w-1 rounded-full bg-current" />
        </span>
      </button>
      {menu}
    </div>
  );
}
