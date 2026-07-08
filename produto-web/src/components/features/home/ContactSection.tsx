import { Container } from "@/components/ui/container";
import { ContactForm } from "@/components/features/home/ContactForm";
import { company, contactSection } from "@/data/company";

export function ContactSection() {
  return (
    <section id="contato" className="bg-background-subtle py-24">
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-brand-600">{contactSection.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              {contactSection.title}
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-text-secondary">{contactSection.description}</p>

            <dl className="mt-10 space-y-6">
              <div>
                <dt className="text-sm font-semibold uppercase tracking-wide text-text-disabled">E-mail comercial</dt>
                <dd className="mt-1 text-lg font-bold text-text-primary">
                  <a href={`mailto:${company.email}`} className="hover:text-brand-600">
                    {company.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold uppercase tracking-wide text-text-disabled">Atendimento</dt>
                <dd className="mt-1 text-lg font-bold text-text-primary">{company.attendance}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl bg-surface p-8 shadow-lg sm:p-10">
            <ContactForm />
          </div>
        </div>
      </Container>
    </section>
  );
}
