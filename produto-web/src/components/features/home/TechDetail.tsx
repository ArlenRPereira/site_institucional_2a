import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { CheckIcon } from "@/components/ui/icons";
import { techDetail } from "@/data/services";

export function TechDetail() {
  return (
    <section id={techDetail.id} className="bg-background py-24">
      <Container>
        <SectionHeading eyebrow={techDetail.eyebrow} title={techDetail.title} description={techDetail.description} />

        <div className="mx-auto mt-14 max-w-4xl">
          <h3 className="text-sm font-bold uppercase tracking-widest text-brand-600">Ofertas comerciais</h3>
          <ul role="list" className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {techDetail.ofertasComerciais.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-400" />
                <span className="text-base text-text-secondary">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-12 max-w-4xl">
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-disabled">
            Capacidades técnicas de suporte
          </h3>
          <ul role="list" className="mt-5 flex flex-wrap gap-2.5">
            {techDetail.capacidadesTecnicas.map((item) => (
              <li key={item} className="rounded-full bg-surface-raised px-4 py-1.5 text-sm text-text-secondary">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
