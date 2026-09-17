"use client";

import { useState } from "react";
import { roles } from "@/data/roles";
import styles from "./Experience.module.css";

export default function Experience() {
  const [open, setOpen] = useState(0);

  return (
    <section id="work" data-section="work" className="section">
      <div className="wrap">
        <div data-reveal className={styles.head}>
          <div className="eyebrow">02 / Experience</div>
          <div className={styles.hint}>select a role to expand</div>
        </div>
        <div className={styles.list}>
          {roles.map((role, i) => {
            const isOpen = open === i;
            const id = `role-${i}`;
            return (
              <button
                key={role.company}
                type="button"
                data-reveal
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => setOpen(isOpen ? -1 : i)}
                className={`${styles.role} ${isOpen ? styles.open : ""}`}
              >
                <div className={styles.num}>{String(i + 1).padStart(2, "0")}</div>
                <div className={styles.when}>
                  <div className={styles.dates}>{role.dates}</div>
                  <div>{role.place}</div>
                </div>
                <div>
                  <div className={styles.titleRow}>
                    <h3 className={styles.title}>{role.title}</h3>
                    <span className={styles.company}>{role.company}</span>
                    <span className={styles.sign} aria-hidden="true">{isOpen ? "−" : "+"}</span>
                  </div>
                  <div className={styles.lead}>{role.lead}</div>
                  <div id={id} className={styles.details}>
                    <div className={styles.detailsInner}>
                      <ul className={styles.bullets} style={{ listStyle: "none", padding: 0 }}>
                        {role.bullets.map((b) => (
                          <li key={b} className={styles.bullet}>{b}</li>
                        ))}
                      </ul>
                      <div className={styles.tags}>
                        {role.tags.map((t) => (
                          <span key={t} className={styles.tag}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
