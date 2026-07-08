import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { problemGroups, problemsSection } from "@/data/problems";

export function Problems() {
  return (
    <section id="problemas" className="bg-background py-24">
      <Container>
        <SectionHeading eyebrow={problemsSection.eyebrow} title={problemsSection.title} />

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-x-12 gap-y-12 lg:grid-cols-2">
          {problemGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-bold uppercase tracking-widest text-brand-600">{group.title}</h3>
              <ul role="list" className="mt-5 space-y-5">
                {group.items.map((item, index) => (
                  <li key={item} className="flex items-start gap-4">
                    <span className="text-sm font-bold text-brand-600">{String(index + 1).padStart(2, "0")}</span>
                    <span className="text-base leading-relaxed text-text-secondary">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
