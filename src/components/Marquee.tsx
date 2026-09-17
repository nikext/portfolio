import { marquee } from "@/data/profile";
import styles from "./Marquee.module.css";

function Row({ items, reverse }: { items: readonly string[]; reverse?: boolean }) {
  const text = items.join(" · ") + " · ";
  return (
    <div className={`${styles.row} ${reverse ? styles.rev : ""}`} aria-hidden={reverse || undefined}>
      <span>{text}</span>
      <span aria-hidden="true">{text}</span>
    </div>
  );
}

export default function Marquee() {
  return (
    <div className={styles.band} aria-label="Skills and certifications">
      <Row items={marquee.top} />
      <Row items={marquee.bottom} reverse />
    </div>
  );
}
