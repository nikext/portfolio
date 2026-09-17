export type StackGroup = { label: string; items: string[] };

export const stack: StackGroup[] = [
  {
    label: "AI & agents",
    items: [
      "Anthropic Claude", "OpenAI", "Google Gemini", "Prompt design", "Agentic workflows", "MCP",
      "Retrieval over internal data", "Claude Code", "Cursor", "Codex", "Google AI Studio",
    ],
  },
  { label: "Languages", items: ["Python", "TypeScript", "JavaScript", "SQL", "Java", "C#", "Bash"] },
  {
    label: "Engineering",
    items: [
      "REST APIs", "OAuth2 / JWT", "Node.js", "Express", "React", "Next.js", "SwiftUI",
      "PostgreSQL", "MongoDB", "Jest", "Cypress", "Software design", "Code review",
    ],
  },
  {
    label: "Cloud & ops",
    items: [
      "GCP", "BigQuery", "GKE", "Cloud SQL", "Logging & Monitoring", "IAM", "AWS", "Docker",
      "Kubernetes", "Terraform", "dbt", "CI/CD", "ITSM / ITIL",
    ],
  },
  {
    label: "Ways of working",
    items: [
      "Stakeholder discovery", "Requirement gathering", "Rapid prototyping", "Demos",
      "Agile / Kanban", "Jira", "UAT", "Technical & non-technical communication",
    ],
  },
];
