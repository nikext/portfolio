"use client";

import { useEffect, useState } from "react";
import { profile } from "@/data/profile";

/** Live wall-clock in the profile's time zone. Renders a dash placeholder on the server. */
export default function Clock() {
  const [time, setTime] = useState("—:—:—");
  useEffect(() => {
    const tick = () => {
      try {
        setTime(new Date().toLocaleTimeString("en-GB", { timeZone: profile.timeZone, hour12: false }));
      } catch {
        setTime(new Date().toLocaleTimeString());
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span suppressHydrationWarning>
      {time} Zurich
    </span>
  );
}
