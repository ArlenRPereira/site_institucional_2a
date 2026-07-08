import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { possibleProjects, projectsSection } from "@/data/projects";

export function Projects() {
  return (
    <section id="projetos" className="bg-background py-24">
      <Container>
        <SectionHeading eyebrow={projectsSection.eyebrow} title={projectsSection.title} />
        <p className="mx-auto mt-4 max-w-2xl text-center text-base italic text-text-secondary">
          {projectsSection.disclaimer}
        </p>

        <ul role="list" className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {possibleProjects.map((project) => (
            <li key={project} className="rounded-lg bg-background-subtle p-6">
              <Badge variant="on-light">Projeto</Badge>
              <p className="mt-4 text-lg font-bold leading-snug text-text-primary">{project}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
