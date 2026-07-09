import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { CodeIcon, LeafIcon, ArrowRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { solutions, solutionsSection } from "@/data/services";

const icons = { tecnologia: CodeIcon, esg: LeafIcon } as const;

export function Solutions() {
  return (
    <section id="solucoes" className="bg-background-subtle py-24">
      <Container>
        <SectionHeading eyebrow={solutionsSection.eyebrow} title={solutionsSection.title} />

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          {solutions.map((solution) => {
            const Icon = icons[solution.key];
            return (
              <div
                key={solution.key}
                className={cn(
                  "rounded-lg border-t-4 bg-surface p-8 shadow-md",
                  solution.accent === "bright" ? "border-t-brand-400" : "border-t-brand-600"
                )}
              >
                <div
                  className={cn(
                    "flex size-14 items-center justify-center rounded-lg",
                    solution.accent === "bright" ? "bg-brand-100 text-brand-600" : "bg-brand-100 text-brand-700"
                  )}
                >
                  <Icon className="size-7" />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-text-primary">{solution.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-text-secondary">{solution.description}</p>
                <a
                  href={solution.href}
                  className="mt-5 inline-flex items-center gap-1.5 text-base font-semibold text-brand-600 transition-colors duration-normal hover:text-brand-700"
                >
                  Saiba mais
                  <ArrowRightIcon className="size-4" />
                </a>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
