"use client";

import { useEffect, useRef, useState } from "react";
import { profile } from "@/data/profile";
import styles from "./Contact.module.css";

export default function Contact() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the mailto link still works */
    }
  };

  const year = new Date().getFullYear();

  return (
    <section id="contact" data-section="contact" className={`section ${styles.section}`}>
      <div className="wrap">
        <div data-reveal className={`eyebrow ${styles.eyebrow}`}>05 / Contact</div>
        <p data-reveal className={styles.pitch}>{profile.openTo}</p>
        <div data-reveal className={styles.row}>
          <a className={styles.mail} href={`mailto:${profile.email}`}>{profile.email}</a>
          <button type="button" className={styles.copy} onClick={copy} aria-live="polite">
            {copied ? "copied ✓" : "copy"}
          </button>
        </div>
        <div data-reveal className={styles.links}>
          <a href={profile.links.github} target="_blank" rel="noopener noreferrer">github.com/nikext ↗</a>
          <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
          <a href={profile.links.credly} target="_blank" rel="noopener noreferrer">Credly ↗</a>
        </div>
        <footer className={styles.footer}>
          <span>{profile.name} — Zurich</span>
          <span suppressHydrationWarning>three.js · next.js · {year}</span>
        </footer>
      </div>
    </section>
  );
}
