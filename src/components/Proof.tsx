import { certifications, education, languages, profile } from "@/data/profile";
import styles from "./Proof.module.css";

export default function Proof() {
  return (
    <section id="proof" data-section="proof" className="section">
      <div className="wrap">
        <div data-reveal className={`eyebrow ${styles.eyebrow}`}>04 / Certified &amp; schooled</div>
        <div className={styles.grid}>
          <div data-reveal className={styles.card}>
            <div className={styles.kicker}>{certifications.issuer}</div>
            <div className={styles.items}>
              {certifications.items.map((c) => (
                <div key={c} className={styles.item}>{c}</div>
              ))}
            </div>
            <a className={styles.verify} href={profile.links.credly} target="_blank" rel="noopener noreferrer">
              Verify on Credly →
            </a>
          </div>

          <div data-reveal className={styles.card}>
            <div className={styles.kicker}>Education</div>
            <div className={styles.item}>{education.degree}</div>
            <div className={styles.small}>
              {education.school}
              <br />
              {education.when}
            </div>
            <div className={styles.note}>{education.note}</div>
          </div>

          <div data-reveal className={styles.card}>
            <div className={styles.kicker}>Languages</div>
            <div className={styles.langs}>
              {languages.map((l) => (
                <div key={l.name}>
                  <div className={styles.langRow}>
                    <span className={styles.langName}>{l.name}</span>
                    <span className={styles.small}>{l.level}</span>
                  </div>
                  <div className={styles.track} role="img" aria-label={`${l.name}: ${l.level}`}>
                    <div className={styles.fill} data-bar={l.width} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
