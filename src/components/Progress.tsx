"use client";

import { useEffect, useRef } from "react";

/** Thin accent bar across the top that tracks scroll progress. */
export default function Progress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      if (bar.current) bar.current.style.width = `${(p * 100).toFixed(2)}%`;
    };
    window.addEventListener("scroll", on, { passive: true });
    on();
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div
      ref={bar}
      aria-hidden="true"
      style={{ position: "fixed", top: 0, left: 0, height: 2, width: 0, background: "var(--accent)", zIndex: 100 }}
    />
  );
}
