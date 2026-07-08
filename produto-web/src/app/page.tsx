import { Hero } from "@/components/features/home/Hero";
import { About } from "@/components/features/home/About";
import { Solutions } from "@/components/features/home/Solutions";
import { TechDetail } from "@/components/features/home/TechDetail";
import { EsgDetail } from "@/components/features/home/EsgDetail";
import { Differentiators } from "@/components/features/home/Differentiators";
import { Projects } from "@/components/features/home/Projects";
import { ContactSection } from "@/components/features/home/ContactSection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <Solutions />
      <TechDetail />
      <EsgDetail />
      <Differentiators />
      <Projects />
      <ContactSection />
    </>
  );
}
