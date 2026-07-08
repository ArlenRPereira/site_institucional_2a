import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { problems, problemsSection } from "@/data/problems";

export function Problems() {
  return (
    <section id="problemas" className="bg-background py-24">
      <Container>
        <SectionHeading eyebrow={problemsSection.eyebrow} title={problemsSection.title} />

        <ul role="list" className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          {problems.map((problem, index) => (
            <li key={problem} className="flex items-start gap-4">
              <span className="text-sm font-bold text-brand-600">{String(index + 1).padStart(2, "0")}</span>
              <span className="text-base leading-relaxed text-text-secondary">{problem}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
