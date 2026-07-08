import Link from "next/link";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { diagnostico } from "@/data/company";
import { cn } from "@/lib/utils";

export function DiagnosticoCta() {
  return (
    <section id="diagnostico" className="bg-brand-600 py-20">
      <Container className="text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-brand-100">{diagnostico.eyebrow}</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {diagnostico.title}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-brand-100">{diagnostico.description}</p>
        <Link href={diagnostico.cta.href} className={cn(buttonVariants({ variant: "outline-on-dark" }), "mt-8")}>
          {diagnostico.cta.label}
        </Link>
      </Container>
    </section>
  );
}
