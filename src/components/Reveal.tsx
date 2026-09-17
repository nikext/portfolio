"use client";

import { useReveal } from "@/lib/useReveal";

/** Mounts the scroll-reveal observer once for the whole page. Renders nothing. */
export default function Reveal() {
  useReveal();
  return null;
}
