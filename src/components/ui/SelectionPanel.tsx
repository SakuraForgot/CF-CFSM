import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Animate a user selection once; live metrics never retrigger or remount the panel. */
export function SelectionPanel({ selectionKey, children, className }: {
  selectionKey: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef(selectionKey);
  useLayoutEffect(() => {
    const changed = previous.current !== selectionKey;
    previous.current = selectionKey;
    if (!changed || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = ref.current?.animate?.(
      [{ opacity: 0.88, transform: "translateY(2px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 360, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
    );
    return () => animation?.cancel();
  }, [selectionKey]);
  return <div ref={ref} className={className}>{children}</div>;
}
