import { profile } from "@/data/profile";

export default function Home() {
  return (
    <main style={{ padding: "var(--gutter)" }}>
      <h1>{profile.name}</h1>
      <p className="eyebrow">{profile.role}</p>
    </main>
  );
}
