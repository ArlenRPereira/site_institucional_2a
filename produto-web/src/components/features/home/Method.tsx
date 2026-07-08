import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { ArrowRightIcon } from "@/components/ui/icons";
import { methodSection, methodTech, methodEsg } from "@/data/method";

function Journey({ title, steps, tone }: { title: string; steps: readonly string[]; tone: "bright" | "deep" }) {
  return (
    <div>
      <h3 className="text-center text-lg font-semibold text-text-primary">{title}</h3>
      <ol className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
        {steps.map((step, index) => (
          <li key={step} className="flex items-center gap-2">
            <span
              className={
                tone === "bright"
                  ? "rounded-full bg-brand-100 px-4 py-2 text-sm font-semibold text-brand-700"
                  : "rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
              }
            >
              {step}
            </span>
            {index < steps.length - 1 && (
              <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0 text-brand-300" />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Method() {
  return (
    <section id="metodo" className="bg-background py-24">
      <Container>
        <SectionHeading eyebrow={methodSection.eyebrow} title={methodSection.title} />

        <div className="mt-14 space-y-14">
          <Journey title={methodTech.title} steps={methodTech.steps} tone="bright" />
          <Journey title={methodEsg.title} steps={methodEsg.steps} tone="deep" />
        </div>
      </Container>
    </section>
  );
}
