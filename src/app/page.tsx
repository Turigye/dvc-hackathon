import { ArrowRight, BookOpen, Gauge, Palette } from "@phosphor-icons/react/dist/ssr";

const readinessAreas = [
  {
    title: "Operating system",
    copy: "Read AGENTS.md before planning, building, testing, or deploying.",
    icon: BookOpen,
  },
  {
    title: "Design discipline",
    copy: "Create and approve design.md before writing product UI.",
    icon: Palette,
  },
  {
    title: "Measured performance",
    copy: "Validate responsive behavior and Core Web Vitals before submission.",
    icon: Gauge,
  },
];

export default function Home() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="readiness-title">
        <h1 id="readiness-title">Build preparation, locked in.</h1>
        <p className="lede">
          This workspace is ready for the live brief. Product UI, imagery, and visual direction begin only after the brief is known.
        </p>
        <a className="primary-link" href="https://dollarvibeclub.com/livehackathon/" target="_blank" rel="noreferrer">
          Open the official hackathon page <ArrowRight aria-hidden="true" size={18} weight="bold" />
        </a>
      </section>

      <section className="readiness" aria-label="Readiness areas">
        {readinessAreas.map(({ title, copy, icon: Icon }) => (
          <article key={title} className="readiness-item">
            <Icon aria-hidden="true" size={28} weight="duotone" />
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
