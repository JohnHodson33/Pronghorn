"use client";

// ScrollShell — horizontal scrolling that you can actually reach.
//
// John, twice (7/16): "the scroll bar's at the very bottom makes it
// impossible… I have to scroll all the way down to the bottom of a 200-row
// list just to see the right-hand columns."
//
// A native overflow-x container puts its scrollbar under the LAST row. This
// mirrors that scrollbar in a sticky strip pinned to the bottom of the
// VIEWPORT, so it's always in reach — and the wide table still scrolls
// natively (trackpad/shift-wheel keep working). The strip only appears when
// the content actually overflows, so full-width tables show nothing.
import { useEffect, useRef, useState } from "react";

export default function ScrollShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);       // scrollable content width
  const [overflowing, setOverflowing] = useState(false);
  const syncing = useRef(false);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const measure = () => {
      setWidth(body.scrollWidth);
      setOverflowing(body.scrollWidth > body.clientWidth + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(body);
    if (body.firstElementChild) ro.observe(body.firstElementChild);
    return () => ro.disconnect();
  }, [children]);

  // two-way scroll sync, guarded against feedback loops
  const mirror = (from: HTMLDivElement | null, to: HTMLDivElement | null) => {
    if (!from || !to || syncing.current) return;
    syncing.current = true;
    to.scrollLeft = from.scrollLeft;
    requestAnimationFrame(() => { syncing.current = false; });
  };

  return (
    <>
      <div
        ref={bodyRef}
        onScroll={() => mirror(bodyRef.current, barRef.current)}
        className={`overflow-x-auto ${className}`}
      >
        {children}
      </div>
      {overflowing && (
        <div
          ref={barRef}
          onScroll={() => mirror(barRef.current, bodyRef.current)}
          className="sticky bottom-0 z-20 overflow-x-auto rounded-b-xl border-x border-b border-zinc-200 bg-white/90 backdrop-blur"
          style={{ height: 14 }}
          aria-hidden
        >
          <div style={{ width, height: 1 }} />
        </div>
      )}
    </>
  );
}
