import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { hero } from "@/data/company";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section
      id="inicio"
      className="relative overflow-hidden bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,#1f3d1c_0%,#0f1f0f_65%)]"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />

      <Container className="relative py-24 text-center sm:py-28 lg:py-32">
        <p className="text-sm font-bold uppercase tracking-widest text-text-on-dark-muted">{hero.eyebrow}</p>

        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          {hero.title}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-on-dark-secondary">{hero.subtitle}</p>

        <p className="mx-auto mt-4 max-w-2xl text-base font-semibold text-brand-300">{hero.complement}</p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a href={hero.primaryCta.href} className={buttonVariants({ variant: "primary" })}>
            {hero.primaryCta.label}
          </a>
          <a href={hero.secondaryCta.href} className={cn(buttonVariants({ variant: "outline-on-dark" }))}>
            {hero.secondaryCta.label}
          </a>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {hero.badges.map(({ label, dotClassName }) => (
            <Badge key={label} variant="on-dark" dot dotClassName={dotClassName}>
              {label}
            </Badge>
          ))}
        </div>
      </Container>
    </section>
  );
}
