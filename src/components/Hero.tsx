"use client";

import dynamic from "next/dynamic";
import { profile } from "@/data/profile";
import Clock from "./Clock";
import styles from "./Hero.module.css";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

export default function Hero() {
  return (
    <section id="top" className={styles.hero}>
      <Scene className={styles.scene} />

      <div className={styles.copy}>
        <div className={styles.clip}>
          <div className={`${styles.rise} ${styles.kicker}`} data-hero-copy>{profile.role}</div>
        </div>
        <h1 className={styles.title} data-hero-copy>
          <span className={styles.clip}>
            <span className={styles.rise} style={{ transitionDelay: "110ms" }}>Nikola</span>
          </span>
          <span className={styles.clip}>
            <span className={styles.rise} style={{ transitionDelay: "220ms" }}>Todorovski</span>
          </span>
        </h1>
        <div className={styles.clip}>
          <p className={`${styles.rise} ${styles.lead}`} data-hero-copy style={{ transitionDelay: "330ms" }}>
            Five years shipping production software. The last one inside a{" "}
            <em>Swiss digital bank</em>, building LLM tooling that people actually use.
          </p>
        </div>
      </div>

      <div className={`${styles.corner} ${styles.left}`}>
        <div className={styles.strong}>{profile.location}</div>
        <div>
          <Clock />
        </div>
      </div>

      <div className={`${styles.corner} ${styles.right}`}>
        <div className={styles.live}>
          <span className={styles.dot} />
          <span className={styles.strong}>{profile.signal}</span>
        </div>
        <div data-scene-hint>drag to orbit · click a node</div>
      </div>

      <div className={styles.scrollHint}>scroll</div>
      <div className={styles.fade} />
    </section>
  );
}
