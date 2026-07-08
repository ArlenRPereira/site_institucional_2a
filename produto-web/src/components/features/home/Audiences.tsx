import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { audiences, audiencesSection } from "@/data/audiences";

export function Audiences() {
  return (
    <section id="publicos" className="bg-background-subtle py-24">
      <Container>
        <SectionHeading eyebrow={audiencesSection.eyebrow} title={audiencesSection.title} />

        <ul role="list" className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((audience) => (
            <li key={audience.name} className="rounded-lg bg-surface p-6 shadow-sm">
              <p className="text-lg font-bold text-text-primary">{audience.name}</p>
              <p className="mt-2 text-base leading-relaxed text-text-secondary">{audience.message}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
