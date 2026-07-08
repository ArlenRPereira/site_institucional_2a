export type SolutionKey = "tecnologia" | "esg";

export const solutions: {
  key: SolutionKey;
  title: string;
  description: string;
  href: string;
  accent: "bright" | "deep";
}[] = [
  {
    key: "tecnologia",
    title: "Tecnologia, SaaS e IA",
    description:
      "Da ideia ao produto digital. Apoiamos empresas e empreendedores desde a concepção da solução até a arquitetura, desenvolvimento, implantação e evolução de sistemas, plataformas SaaS, Micro SaaS, automações e soluções com inteligência artificial.",
    href: "#tecnologia",
    accent: "bright",
  },
  {
    key: "esg",
    title: "ESG e Projetos Sociais",
    description:
      "Estruturamos projetos ESG, desenvolvimento institucional, diagnósticos territoriais e programas de impacto voltados para prefeituras, instituições e organizações.",
    href: "#esg",
    accent: "deep",
  },
];

export const solutionsSection = {
  eyebrow: "Frentes de atuação",
  title: "Duas frentes, um mesmo compromisso com resultado",
} as const;

export const techDetail = {
  id: "tecnologia",
  eyebrow: "Tecnologia, SaaS e IA",
  title: "Da ideia ao produto digital",
  description:
    "Apoiamos empresas e empreendedores em todo o ciclo de vida do produto digital — da concepção à evolução contínua, com foco em plataformas SaaS, Micro SaaS, automação e inteligência artificial.",
  steps: [
    "Ideia",
    "Descoberta",
    "MVP",
    "Arquitetura",
    "Desenvolvimento",
    "Automação e IA",
    "Deploy",
    "Evolução",
  ],
  services: [
    "Descoberta e discovery de produto",
    "Arquitetura de software e sistemas",
    "Desenvolvimento de plataformas SaaS",
    "Desenvolvimento de Micro SaaS",
    "Aplicações web sob medida",
    "Aplicativos mobile",
    "Automação de processos com IA",
    "Integração de sistemas e APIs",
    "Dashboards e painéis de indicadores",
    "Modernização de sistemas legados",
    "Consultoria técnica e revisão de arquitetura",
    "Prototipação e MVP",
    "DevOps e infraestrutura em nuvem",
    "Segurança e boas práticas de desenvolvimento",
    "Evolução contínua e suporte técnico",
  ],
} as const;

export const esgDetail = {
  id: "esg",
  eyebrow: "ESG e Projetos Sociais",
  title: "Do diagnóstico ao impacto mensurável",
  description:
    "Estruturamos projetos ESG, desenvolvimento institucional e gestão de projetos sociais para prefeituras, instituições e organizações — do diagnóstico à prestação de contas.",
  steps: ["Diagnóstico", "Planejamento", "Execução", "Indicadores", "Impacto", "Prestação de contas"],
  services: [
    "Diagnóstico institucional e territorial",
    "Planejamento estratégico de projetos sociais",
    "Estruturação de programas ESG",
    "Elaboração de projetos para editais e captação de recursos",
    "Gestão de projetos sociais",
    "Monitoramento e avaliação de impacto",
    "Construção de indicadores sociais",
    "Relatórios de impacto e prestação de contas",
    "Capacitação institucional de equipes",
    "Assessoria a prefeituras e órgãos públicos",
    "Articulação com organizações sociais e parceiros",
    "Consultoria em governança e compliance social",
  ],
} as const;

export const differentiatorsSection = {
  eyebrow: "Diferenciais",
  title: "Por que a 2A",
} as const;

export const differentiators: string[] = [
  "Atuação da ideia à implementação",
  "Visão técnica e visão de negócio",
  "Experiência em arquitetura de software",
  "Foco em SaaS, Micro SaaS e IA",
  "Atuação em projetos sociais e ESG",
  "Clareza na comunicação",
  "Soluções viáveis e evolutivas",
  "Foco em resultado prático",
];
