import { Hero } from "@/components/features/home/Hero";
import { Audiences } from "@/components/features/home/Audiences";
import { Problems } from "@/components/features/home/Problems";
import { Solutions } from "@/components/features/home/Solutions";
import { TechDetail } from "@/components/features/home/TechDetail";
import { EsgDetail } from "@/components/features/home/EsgDetail";
import { Method } from "@/components/features/home/Method";
import { Projects } from "@/components/features/home/Projects";
import { Differentiators } from "@/components/features/home/Differentiators";
import { DiagnosticoCta } from "@/components/features/home/DiagnosticoCta";
import { ContactSection } from "@/components/features/home/ContactSection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Audiences />
      <Problems />
      <Solutions />
      <TechDetail />
      <EsgDetail />
      <Method />
      <Projects />
      <Differentiators />
      <DiagnosticoCta />
      <ContactSection />
    </>
  );
}
