export type Role = {
  title: string;
  company: string;
  dates: string;
  place: string;
  lead: string;
  bullets: string[];
  tags: string[];
};

export const roles: Role[] = [
  {
    title: "IT Operations Specialist",
    company: "radicant bank",
    dates: "Aug 2025 — present",
    place: "Zurich · Swiss digital bank",
    lead: "Automating operations and prototyping internal tooling with AI, while keeping high-priority fintech applications running.",
    bullets: [
      "Use Claude Code, Gemini and Google AI Studio to automate operational work, speed up incident diagnosis and prototype internal tools for non-engineer colleagues.",
      "Automate routine and manual processes in Python and SQL; build metric- and log-based alerting with dbt and Terraform.",
      "Support production environments and release management — deployment and post-release monitoring — sustaining 99.9% uptime.",
      "Manage GCP infrastructure (Compute Engine, Cloud SQL, GKE, BigQuery, Logging, Monitoring, Cloud Storage) following ITSM practice.",
      "Support online-banking users daily and translate what they report into fixes and tooling.",
      "Work with development, security and compliance to improve reliability in a regulated environment.",
    ],
    tags: ["Python", "SQL", "dbt", "Terraform", "GCP", "Claude Code", "ITIL"],
  },
  {
    title: "Full-Stack Engineer",
    company: "VAD Personal · contract",
    dates: "Nov 2024 — May 2025",
    place: "Bülach, Zurich",
    lead: "Designed and delivered a multi-tenant Employee Management System for a Swiss staffing company, end to end.",
    bullets: [
      "Company and employee administration, time tracking and document generation — requirements gathered directly from the client and iterated until it fit their real process.",
      "Role-based permission control with explicit levels for Admins, Employers and Employees.",
      "Responsive, accessible frontend in Next.js + TypeScript + Tailwind; RESTful Node/Express backend on PostgreSQL.",
      "Auth and sessions secured with NextAuth.js (JWT); time reports generated as PDFs with PDFKit.",
      "Deployed and operated on Render with CI/CD pipelines.",
    ],
    tags: ["Next.js", "TypeScript", "Express", "PostgreSQL", "NextAuth", "CI/CD"],
  },
  {
    title: "Frontend Engineer",
    company: "floatz.ai",
    dates: "Apr 2024 — Oct 2024",
    place: "Zurich · AI product startup",
    lead: "Built features and rebuilt the UI of an AI platform — making it both operational and pleasant to use.",
    bullets: [
      "New functionality and UI work across the platform in Next.js and React.",
      "Integrated OAuth protocols and full registration/login; extended into Node.js backend work with OAuth2 and Stripe payments.",
      "Owned several architecture decisions, full-cycle features and performance optimisation.",
      "Redesigned pages using advanced CSS and JS libraries, lifting engagement metrics by 20%.",
      "Resolved critical bugs at critical junctures to keep the experience smooth.",
    ],
    tags: ["React", "Next.js", "Node.js", "OAuth2", "Stripe"],
  },
  {
    title: "Software Engineer",
    company: "Amdocs",
    dates: "Mar 2021 — May 2023",
    place: "Sofia, Bulgaria",
    lead: "Shipped features for cloud web applications and kept the codebase stable through tests and reviews.",
    bullets: [
      "Implemented features in TypeScript and React, improving functionality and user satisfaction.",
      "Wrote and maintained unit and UI tests with Jest and Cypress.",
      "Anticipated and fixed defects early, reducing user complaints by 25%.",
      "Led technical discussions and stakeholder demos that informed the roadmap.",
      "Onboarded and guided new engineers across team codebases.",
      "Agile requirement gathering; Git, PostgreSQL and AWS for scalable, secure infrastructure.",
    ],
    tags: ["TypeScript", "React", "Jest", "Cypress", "AWS", "Agile"],
  },
];
