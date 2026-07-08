import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { CheckIcon, ArrowRightIcon } from "@/components/ui/icons";
import { techDetail } from "@/data/services";

export function TechDetail() {
  return (
    <section id={techDetail.id} className="bg-background py-24">
      <Container>
        <SectionHeading eyebrow={techDetail.eyebrow} title={techDetail.title} description={techDetail.description} />

        <ol className="mt-12 flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
          {techDetail.steps.map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-full bg-brand-100 px-4 py-2 text-sm font-semibold text-brand-700">{step}</span>
              {index < techDetail.steps.length - 1 && (
                <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0 text-brand-300" />
              )}
            </li>
          ))}
        </ol>

        <ul role="list" className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {techDetail.services.map((service) => (
            <li key={service} className="flex items-start gap-3">
              <CheckIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-400" />
              <span className="text-base text-text-secondary">{service}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
