import { stack } from "@/data/stack";
import styles from "./Stack.module.css";

export default function Stack() {
  return (
    <section id="stack" data-section="stack" className="section">
      <div className="wrap">
        <div data-reveal className={`eyebrow ${styles.eyebrow}`}>03 / Stack</div>
        <div className={styles.list}>
          {stack.map((g) => (
            <div key={g.label} data-reveal className={styles.group}>
              <div className={styles.label}>{g.label}</div>
              <div className={styles.items}>
                {g.items.map((item) => (
                  <span key={item} className={styles.chip}>{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
