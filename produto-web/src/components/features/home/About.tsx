import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { about } from "@/data/company";

export function About() {
  return (
    <section id="sobre" className="bg-background py-24">
      <Container>
        <SectionHeading eyebrow={about.eyebrow} title={about.title} />
        <div className="mx-auto mt-10 max-w-3xl space-y-6 text-center">
          {about.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-lg leading-relaxed text-text-secondary">
              {paragraph}
            </p>
          ))}
        </div>
      </Container>
    </section>
  );
}
