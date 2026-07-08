import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { differentiators, differentiatorsSection } from "@/data/services";
import { forWhom } from "@/data/company";

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

        <div id="para-quem" className="mt-16 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-text-on-dark-muted">{forWhom.eyebrow}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {forWhom.audiences.map((audience) => (
              <Badge key={audience} variant="on-dark" dot>
                {audience}
              </Badge>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
