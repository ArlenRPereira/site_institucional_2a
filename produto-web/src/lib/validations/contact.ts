import { z } from "zod";

export const CONTACT_INTERESSE_OPTIONS = [
  "Tecnologia, SaaS e IA",
  "ESG e Projetos Sociais",
  "Ambos",
  "Outro",
] as const;

export const contactFormSchema = z.object({
  nome: z.string().trim().min(1, "Informe seu nome").max(120, "Nome muito longo"),
  email: z.string().trim().min(1, "Informe seu e-mail").email("E-mail inválido"),
  telefone: z.string().trim().max(30, "Telefone muito longo").optional().or(z.literal("")),
  empresa: z.string().trim().max(160, "Nome muito longo").optional().or(z.literal("")),
  interesse: z.enum(CONTACT_INTERESSE_OPTIONS, {
    errorMap: () => ({ message: "Selecione o tipo de interesse" }),
  }),
  mensagem: z.string().trim().min(1, "Conte um pouco sobre o seu projeto").max(2000, "Mensagem muito longa"),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
