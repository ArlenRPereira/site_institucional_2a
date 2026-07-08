import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { CheckIcon, ArrowRightIcon } from "@/components/ui/icons";
import { esgDetail } from "@/data/services";

export function EsgDetail() {
  return (
    <section id={esgDetail.id} className="bg-background-subtle py-24">
      <Container>
        <SectionHeading eyebrow={esgDetail.eyebrow} title={esgDetail.title} description={esgDetail.description} />

        <ol className="mt-12 flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
          {esgDetail.steps.map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">{step}</span>
              {index < esgDetail.steps.length - 1 && (
                <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0 text-brand-400" />
              )}
            </li>
          ))}
        </ol>

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
