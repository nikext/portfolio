"use client";

import { useEffect, useState } from "react";
import { profile } from "@/data/profile";
import styles from "./Header.module.css";

const items = [
  { id: "work", label: "Work" },
  { id: "stack", label: "Stack" },
  { id: "proof", label: "Proof" },
  { id: "contact", label: "Contact" },
];

/** Logo mark: an "N" drawn as a single stroke with the accent dot as its pivot. */
function Mark() {
  return (
    <span className={styles.mark} aria-hidden="true">
      <svg viewBox="0 0 22 22">
        <path className={styles.markPath} d="M4 19V3l14 16V3" />
        <circle className={styles.markDot} cx="11" cy="11" r="2.2" />
      </svg>
    </span>
  );
}

export default function Header() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const id = (e.target as HTMLElement).dataset.section;
          if (!id) return;
          if (e.isIntersecting) setActive(id);
          else setActive((cur) => (cur === id ? null : cur));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    document.querySelectorAll("[data-section]").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <header className={styles.header}>
      <a href="#top" className={styles.logo} aria-label={`${profile.name} — back to top`}>
        <Mark />
        <span className={styles.name}>{profile.shortName}</span>
      </a>
      <nav className={styles.nav} aria-label="Sections">
        {items.map((it) => (
          <a key={it.id} href={`#${it.id}`} className={active === it.id ? styles.active : undefined}>
            {it.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
