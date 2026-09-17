"use client";

import { useEffect } from "react";

/**
 * Flips every [data-reveal] element to .is-in once it scrolls into view,
 * and fills any [data-bar] child to its target width. A safety timer makes
 * sure nothing stays hidden if the observer never fires.
 */
export function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const show = (el: HTMLElement) => {
      el.classList.add("is-in");
      el.querySelectorAll<HTMLElement>("[data-bar]").forEach((b) => {
        b.style.width = b.dataset.bar ?? "0";
      });
    };

    if (!("IntersectionObserver" in window)) {
      els.forEach(show);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          show(e.target as HTMLElement);
          io.unobserve(e.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    els.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 6) * 60}ms`;
      io.observe(el);
    });

    const safety = window.setTimeout(() => els.forEach(show), 4000);
    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, []);
}
