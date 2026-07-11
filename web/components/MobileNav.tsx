"use client";

// Mobile nav drawer — reuses the Sidebar component inside an overlay so the
// nav stays single-sourced (Sidebar.tsx remains the PM's file). Hidden on
// md+ where the regular sidebar shows.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer on navigation.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm md:hidden"
      >
        ☰
      </button>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-zinc-900/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-60 max-w-[80vw]">
            {children}
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="absolute left-60 top-3 ml-2 rounded-md bg-white/90 px-2.5 py-1.5 text-sm shadow"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
