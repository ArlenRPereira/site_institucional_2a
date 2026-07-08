import { z } from "zod";

export const CONTACT_INTERESSE_OPTIONS = [
  "Criar um MVP ou produto digital",
  "Desenvolver sistema sob medida",
  "Automatizar processos com IA",
  "Modernizar uma solução existente",
  "ESG e Projetos Sociais",
  "Ambos",
  "Outro",
] as const;

export const CONTACT_MOMENTO_OPTIONS = [
  "Tenho apenas uma ideia",
  "Já tenho um escopo inicial",
  "Preciso validar um MVP",
  "Já tenho um sistema e preciso evoluir",
  "Preciso estruturar um projeto social/ESG",
  "Quero entender o melhor caminho",
] as const;

export const contactFormSchema = z.object({
  nome: z.string().trim().min(1, "Informe seu nome").max(120, "Nome muito longo"),
  email: z.string().trim().min(1, "Informe seu e-mail").email("E-mail inválido"),
  telefone: z.string().trim().min(1, "Informe seu telefone").max(30, "Telefone muito longo"),
  empresa: z.string().trim().max(160, "Nome muito longo").optional().or(z.literal("")),
  interesse: z.enum(CONTACT_INTERESSE_OPTIONS, {
    errorMap: () => ({ message: "Selecione o tipo de interesse" }),
  }),
  momentoProjeto: z.enum(CONTACT_MOMENTO_OPTIONS, {
    errorMap: () => ({ message: "Selecione o momento do projeto" }),
  }),
  mensagem: z.string().trim().max(2000, "Mensagem muito longa").optional().or(z.literal("")),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
