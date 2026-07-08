export const company = {
  name: "2A Desenvolvimento",
  legalName: "2A Desenvolvimento e Tecnologia Ltda",
  tagline: "Desenvolvimento & Tecnologia",
  domain: "2adesenvolvimento.com.br",
  email: "contato@2adesenvolvimento.com.br",
  attendance: "Empresas, instituições e prefeituras em todo o Brasil",
  seoDescription:
    "A 2A Desenvolvimento e Tecnologia ajuda empresas, startups e instituições a criar MVPs, sistemas sob medida, plataformas digitais, automações com IA e projetos ESG com impacto mensurável.",
  ogDescription: "Tecnologia, inovação e impacto social para empresas, startups, instituições e governos.",
} as const;

export const hero = {
  eyebrow: "2A Desenvolvimento e Tecnologia",
  title: "Unimos tecnologia, produtos digitais e projetos sociais para transformar ideias, processos e iniciativas em resultados mensuráveis.",
  subtitle:
    "A 2A Desenvolvimento e Tecnologia ajuda empresas, startups, prefeituras e instituições a criar soluções digitais, validar MVPs, automatizar operações, estruturar projetos ESG e gerir programas sociais com indicadores, governança e impacto.",
  complement: "Da ideia à validação. Do projeto à execução. Da operação ao impacto mensurável.",
  primaryCta: { label: "Solicitar uma conversa inicial", href: "#contato" },
  secondaryCta: { label: "Conhecer soluções", href: "#solucoes" },
  badges: [
    { label: "Tecnologia e Produtos Digitais", dotClassName: "bg-info" },
    { label: "ESG & Projetos Sociais", dotClassName: undefined },
  ],
} as const;

export const diagnostico = {
  eyebrow: "Diagnóstico inicial",
  title: "Solicite uma conversa inicial sobre seu projeto",
  description:
    "Em uma conversa inicial, entendemos sua ideia, processo ou desafio e indicamos o melhor caminho para transformar isso em uma solução digital, projeto estruturado ou iniciativa com impacto mensurável.",
  cta: { label: "Solicitar conversa inicial", href: "#contato" },
} as const;

export const contactSection = {
  eyebrow: "Contato",
  title: "Vamos conversar sobre o seu projeto?",
  description:
    "Conte um pouco sobre sua necessidade — seja um produto digital, uma automação ou um projeto ESG — e nossa equipe retorna o contato.",
  consent:
    "Ao enviar este formulário, você concorda que a 2A Desenvolvimento e Tecnologia utilize os dados informados exclusivamente para retorno de contato relacionado à sua solicitação.",
} as const;

export const privacyPolicy = {
  title: "Política de Privacidade",
  updatedAt: "2026-01-01",
  sections: [
    {
      heading: "Quais dados coletamos",
      body: "Coletamos os dados informados voluntariamente no formulário de contato do site: nome, e-mail, telefone (opcional), empresa/instituição/prefeitura (opcional), tipo de interesse, momento do projeto e mensagem.",
    },
    {
      heading: "Finalidade do tratamento",
      body: "Os dados são utilizados exclusivamente para retorno comercial à solicitação enviada — não são utilizados para nenhuma outra finalidade, nem compartilhados com terceiros para fins de marketing.",
    },
    {
      heading: "Como os dados são processados",
      body: "O envio do formulário é repassado, via integração server-side, a um workflow responsável por encaminhar o contato por e-mail à nossa equipe comercial. Nenhum dado é armazenado em banco de dados pela aplicação do site.",
    },
    {
      heading: "Como solicitar remoção",
      body: `Para solicitar a remoção ou revisão dos seus dados, envie um e-mail para ${"contato@2adesenvolvimento.com.br"} informando o pedido — respondemos em até 15 dias úteis.`,
    },
    {
      heading: "Cookies e analytics",
      body: "Este site não utiliza cookies de rastreamento nem ferramentas de analytics de terceiros.",
    },
    {
      heading: "Não venda de dados",
      body: "A 2A Desenvolvimento e Tecnologia Ltda não vende, aluga ou comercializa dados pessoais coletados por este site sob nenhuma hipótese.",
    },
  ],
} as const;
