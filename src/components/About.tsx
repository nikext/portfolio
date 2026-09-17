import { about, profile } from "@/data/profile";
import Portrait from "./Portrait";
import styles from "./About.module.css";

export default function About() {
  return (
    <section data-section="about" className="section" style={{ borderTop: 0 }}>
      <div className={`wrap ${styles.grid}`}>
        <div>
          <div data-reveal className={`eyebrow ${styles.eyebrow}`}>{about.eyebrow}</div>
          <p data-reveal className={styles.lead}>{about.lead}</p>
          {about.body.map((p) => (
            <p key={p} data-reveal className={styles.body}>{p}</p>
          ))}
        </div>
        <div data-reveal className={styles.aside}>
          <Portrait />
          <div className={styles.caption}>
            Currently: {profile.currently[0]},
            <br />
            {profile.currently[1]}
          </div>
        </div>
      </div>
    </section>
  );
}
