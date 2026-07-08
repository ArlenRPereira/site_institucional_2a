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
    title: "Tecnologia e Produtos Digitais",
    description:
      "Ajudamos empresas e startups a transformar ideias e processos manuais em MVPs, sistemas sob medida e plataformas digitais seguras, escaláveis e prontas para crescer.",
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
  eyebrow: "Tecnologia e Produtos Digitais",
  title: "Da ideia ao produto digital pronto para crescer",
  description:
    "Apoiamos empresas, startups e instituições a transformar ideias, processos manuais e oportunidades de negócio em soluções digitais viáveis, seguras e escaláveis — da concepção à evolução contínua.",
  ofertasComerciais: [
    "MVP para startups e validação de ideias",
    "Produto digital para apresentação a investidores",
    "Sistema sob medida para empresas",
    "Plataforma robusta, segura e escalável",
    "Automação de processos com inteligência artificial",
    "Aplicativos e portais digitais",
    "Modernização de sistemas e operações digitais",
    "Dashboards e painéis de indicadores",
    "Integrações entre sistemas",
  ],
  capacidadesTecnicas: [
    "Arquitetura de Software",
    "SaaS e Micro SaaS",
    "Aplicações Web",
    "Aplicativos Mobile",
    "APIs e Integrações",
    "Automação com n8n",
    "Agentes de IA",
    "Cloud e DevOps",
    "Dashboards e Indicadores",
  ],
} as const;

export const esgDetail = {
  id: "esg",
  eyebrow: "ESG e Projetos Sociais",
  title: "Do diagnóstico ao impacto mensurável",
  description:
    "Estruturamos projetos ESG, desenvolvimento institucional e gestão de projetos sociais para prefeituras, instituições e organizações — do diagnóstico à prestação de contas.",
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
