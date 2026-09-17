"use client";

import { useEffect, useState } from "react";
import { profile } from "@/data/profile";
import styles from "./About.module.css";

/**
 * Portrait tile. The server renders the hatched placeholder; on the client we
 * probe /portrait.jpg and swap the photo in only once it has actually loaded,
 * so a missing file never leaves a broken image behind.
 */
export default function Portrait() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.portrait) return;
    const img = new Image();
    img.onload = () => setSrc(profile.portrait);
    img.src = profile.portrait;
    return () => { img.onload = null; };
  }, []);

  return (
    <div className={styles.frame}>
      <div className={styles.hatch} />
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- static export, no optimizer
        <img src={src} alt={profile.portraitAlt} />
      ) : (
        <div className={styles.placeholder}>
          portrait
          <br />
          add public/portrait.jpg
        </div>
      )}
    </div>
  );
}
