export type NodeKind = "source" | "pipeline" | "context" | "model" | "tools" | "output";

export type GraphNode = {
  name: string;
  kind: NodeKind;
  meta: string;
  x: number;
  y: number;
  z: number;
};

/** The hero scene: an AI-ops pipeline laid out left to right in columns by x. */
export const nodes: GraphNode[] = [
  { name: "Online banking users", kind: "source", meta: "Daily support: reported issues become fixes and tooling.", x: -10, y: 1.4, z: 0.6 },
  { name: "Logs & metrics", kind: "source", meta: "Cloud Logging and Monitoring streams, continuously watched.", x: -10, y: -1.6, z: -0.8 },
  { name: "Incident intake", kind: "pipeline", meta: "Triage, correlate, reproduce — fast, with AI assist on diagnosis.", x: -5, y: 0.9, z: 1.2 },
  { name: "BigQuery", kind: "pipeline", meta: "dbt models over operational data feeding alerts and analysis.", x: -5, y: -2, z: -1.1 },
  { name: "Retrieval", kind: "context", meta: "Retrieval over internal data — scoped, permissioned, auditable.", x: -0.4, y: 2.2, z: -0.6 },
  { name: "Claude", kind: "model", meta: "Diagnosis, drafting and agentic workflows over internal tooling.", x: 0, y: 0, z: 0.8 },
  { name: "Gemini / AI Studio", kind: "model", meta: "Fast prototyping of internal tools for non-engineer colleagues.", x: -0.2, y: -2.3, z: -0.4 },
  { name: "MCP tools", kind: "tools", meta: "A typed tool surface over internal systems.", x: 4.8, y: 1.6, z: 0.9 },
  { name: "Python / SQL automation", kind: "tools", meta: "Manual, repeated processes — removed.", x: 4.8, y: -1.5, z: -0.9 },
  { name: "Alerting — dbt + Terraform", kind: "output", meta: "Metric- and log-based alerting, defined as code.", x: 9.6, y: 1.9, z: -0.5 },
  { name: "GKE releases", kind: "output", meta: "Release management, deployment and post-release monitoring.", x: 9.6, y: -0.4, z: 0.7 },
  { name: "99.9% uptime", kind: "output", meta: "The point of all of it.", x: 9.8, y: -2.6, z: -0.2 },
];
