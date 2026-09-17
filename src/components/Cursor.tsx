"use client";

import { useEffect, useRef } from "react";
import styles from "./Cursor.module.css";

const HOT = "a,button,[role=button],[data-hot]";

/** Trailing ring cursor. Only mounts its listeners on fine pointers without reduced motion. */
export default function Cursor() {
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = ring.current;
    if (!fine || calm || !el) return;

    let rx = 0, ry = 0, tx = 0, ty = 0, raf = 0;
    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      el.style.opacity = "1";
      const t = e.target as HTMLElement | null;
      const hot = !!t?.closest?.(HOT);
      const inScene = !!t?.closest?.("[data-scene]");
      const s = hot ? 54 : inScene ? 40 : 26;
      el.style.width = `${s}px`;
      el.style.height = `${s}px`;
      el.style.backgroundColor = hot ? "var(--accent-soft)" : "transparent";
    };
    const onLeave = () => { el.style.opacity = "0"; };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      rx += (tx - rx) * 0.18;
      ry += (ty - ry) * 0.18;
      el.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    };
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <div ref={ring} className={styles.ring} aria-hidden="true" />;
}
