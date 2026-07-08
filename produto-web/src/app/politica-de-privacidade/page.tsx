import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { privacyPolicy } from "@/data/company";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Saiba quais dados coletamos no formulário de contato, sua finalidade e como solicitar remoção.",
  alternates: { canonical: "/politica-de-privacidade" },
};

export default function PrivacyPolicyPage() {
  return (
    <section className="bg-background py-20">
      <Container className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">{privacyPolicy.title}</h1>
        <p className="mt-3 text-sm text-text-disabled">Última atualização: {privacyPolicy.updatedAt}</p>

        <div className="mt-10 space-y-10">
          {privacyPolicy.sections.map((section) => (
            <div key={section.heading}>
              <h2 className="text-xl font-semibold text-text-primary">{section.heading}</h2>
              <p className="mt-3 text-base leading-relaxed text-text-secondary">{section.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
