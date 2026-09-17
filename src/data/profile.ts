export const profile = {
  name: "Nikola Todorovski",
  shortName: "N. Todorovski",
  role: "Software Engineer — AI Applications & Production Reliability",
  summary:
    "Five years shipping production software. The last one inside a Swiss digital bank, building LLM tooling that people actually use.",
  location: "Zurich, Switzerland",
  timeZone: "Europe/Zurich",
  /** Live-dot status line in the hero corner. */
  signal: "Building AI tooling in production",
  email: "nikolatod42@gmail.com",
  /** Path under /public. Leave empty to show the placeholder tile. */
  portrait: "/portrait.jpg",
  portraitAlt: "Portrait of Nikola Todorovski",
  /** Shown under the portrait. */
  focus: {
    label: "Now building",
    items: [
      "Agentic workflows on Claude + MCP",
      "LLM tooling that ships to production",
      "Automation that removes manual work",
    ],
  },
  openTo: "Open to AI engineering roles in Switzerland.",
  links: {
    github: "https://github.com/nikext",
    linkedin: "https://www.linkedin.com/in/nikola-todorovski-717927247/",
    credly: "https://www.credly.com/users/nikola-todorovski/badges/credly",
  },
} as const;

export const greetings = ["Grüezi", "Здравей", "Hello"] as const;

export const marquee = {
  top: [
    "Python", "TypeScript", "SQL", "Anthropic Claude", "OpenAI", "Gemini", "MCP",
    "Agentic workflows", "GCP", "BigQuery", "Terraform", "dbt", "Kubernetes", "Next.js",
  ],
  bottom: [
    "Associate Cloud Engineer", "Generative AI Leader", "AI Professional",
    "Incident response", "Release management", "Stakeholder discovery", "Rapid prototyping",
  ],
} as const;

export const about = {
  eyebrow: "01 / Close to the business",
  lead: "I work where the problem actually is: talk to the people using the thing, prototype fast, then iterate until the tool is used and not just delivered.",
  body: [
    "Day to day that's Python, TypeScript and SQL on Google Cloud — LLM-based tooling and automation on Anthropic Claude, OpenAI and Gemini, and AI-assisted development used responsibly inside a regulated bank.",
    "Google-certified in cloud engineering and generative AI. Clean code, tests, reliability, careful data handling — because in fintech the boring parts are the product.",
  ],
} as const;

export const languages = [
  { name: "Bulgarian", level: "C2 · native", width: "100%" },
  { name: "English", level: "C1 · professional", width: "82%" },
  { name: "German", level: "A1 · actively learning", width: "22%" },
] as const;

export const certifications = {
  issuer: "Google Cloud",
  items: ["Associate Cloud Engineer", "Generative AI Leader", "AI Professional"],
} as const;

export const education = {
  degree: "BSc Informatics & Software Science",
  school: "Technical University of Sofia",
  when: "Graduated Feb 2024",
  note: "Software architecture, system design and integration, security, big data, IoT and AI — four years hands-on in Java, Python, JavaScript and C#.",
} as const;
