"use client";

import { useEffect, useRef, useState } from "react";
import { greetings } from "@/data/profile";
import styles from "./Loader.module.css";

const FULL = 1950;
const CALM = 120;

/**
 * Intro curtain. Cycles three greetings, counts to 100, then slides away and
 * marks <html> with .is-ready so the hero copy can rise in.
 */
export default function Loader() {
  const [done, setDone] = useState(false);
  const counter = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dur = calm ? CALM : FULL;
    const t0 = performance.now();
    let raf = 0;
    const count = () => {
      const p = Math.min(1, (performance.now() - t0) / dur);
      if (counter.current) counter.current.textContent = String(Math.round(p * 100)).padStart(3, "0");
      if (p < 1) raf = requestAnimationFrame(count);
    };
    count();

    const release = () => {
      setDone(true);
      document.documentElement.classList.add("is-ready");
    };
    const t = window.setTimeout(release, dur * 0.72);
    // never trap the visitor behind the curtain
    const safety = window.setTimeout(release, 4000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      window.clearTimeout(safety);
    };
  }, []);

  return (
    <div className={`${styles.loader} ${done ? styles.done : ""}`} aria-hidden="true">
      <div className={styles.greet}>
        {greetings.map((g, i) => (
          <span key={g} style={{ animationDelay: `${i * 0.62}s` }}>
            {g}
          </span>
        ))}
      </div>
      <div className={styles.track}>
        <div className={styles.fill} />
      </div>
      <div ref={counter} className={styles.counter}>
        000
      </div>
    </div>
  );
}
