import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { differentiators, differentiatorsSection } from "@/data/services";

export function Differentiators() {
  return (
    <section id="diferenciais" className="bg-surface-dark py-24">
      <Container>
        <SectionHeading eyebrow={differentiatorsSection.eyebrow} title={differentiatorsSection.title} onDark />

        <ul role="list" className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {differentiators.map((item, index) => (
            <li key={item} className="rounded-lg border border-border-dark bg-surface-dark-raised p-6">
              <span className="text-sm font-bold text-brand-300">{String(index + 1).padStart(2, "0")}</span>
              <p className="mt-3 text-lg font-semibold leading-snug text-white">{item}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
