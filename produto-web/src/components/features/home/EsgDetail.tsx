import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { CheckIcon } from "@/components/ui/icons";
import { esgDetail } from "@/data/services";

export function EsgDetail() {
  return (
    <section id={esgDetail.id} className="bg-background-subtle py-24">
      <Container>
        <SectionHeading eyebrow={esgDetail.eyebrow} title={esgDetail.title} description={esgDetail.description} />

        <ul role="list" className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {esgDetail.services.map((service) => (
            <li key={service} className="flex items-start gap-3">
              <CheckIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-600" />
              <span className="text-base text-text-secondary">{service}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
