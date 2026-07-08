"use client";

import { useState, type FormEvent } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { contactFormSchema, CONTACT_INTERESSE_OPTIONS, type ContactFormInput } from "@/lib/validations/contact";
import { contactSection } from "@/data/company";

type FormValues = {
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  interesse: ContactFormInput["interesse"] | "";
  mensagem: string;
};

const initialValues: FormValues = {
  nome: "",
  email: "",
  telefone: "",
  empresa: "",
  interesse: "",
  mensagem: "",
};

/** Campo honeypot anti-spam — deve permanecer vazio para envios legítimos. */
const HONEYPOT_FIELD = "website";

type FieldErrors = Partial<Record<keyof FormValues, string>>;
type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");

  function updateField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = contactFormSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FormValues;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setStatus("submitting");

    try {
      const response = await fetch("/api/webhooks/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, [HONEYPOT_FIELD]: honeypot }),
      });

      if (!response.ok) {
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="flex flex-col items-center py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-brand-100 text-brand-600">
          <CheckIcon className="size-7" />
        </div>
        <h3 className="mt-6 text-2xl font-bold text-text-primary">Mensagem enviada!</h3>
        <p className="mt-2 max-w-sm text-base text-text-secondary">
          Recebemos sua solicitação e nossa equipe vai retornar o contato em breve.
        </p>
        <Button
          type="button"
          variant="outline-on-light"
          className="mt-8"
          onClick={() => {
            setValues(initialValues);
            setStatus("idle");
          }}
        >
          Enviar outra mensagem
        </Button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      <input
        type="text"
        name={HONEYPOT_FIELD}
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] top-auto size-px overflow-hidden"
      />

      <div>
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          name="nome"
          autoComplete="name"
          placeholder="Seu nome"
          value={values.nome}
          onChange={(e) => updateField("nome", e.target.value)}
          invalid={!!errors.nome}
          aria-describedby={errors.nome ? "nome-error" : undefined}
        />
        {errors.nome && (
          <p id="nome-error" role="alert" className="mt-1.5 text-sm text-danger">
            {errors.nome}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com"
          value={values.email}
          onChange={(e) => updateField("email", e.target.value)}
          invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="mt-1.5 text-sm text-danger">
            {errors.email}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="telefone">Telefone / WhatsApp</Label>
          <Input
            id="telefone"
            name="telefone"
            type="tel"
            autoComplete="tel"
            placeholder="(00) 00000-0000"
            value={values.telefone}
            onChange={(e) => updateField("telefone", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="empresa">Empresa / Instituição</Label>
          <Input
            id="empresa"
            name="empresa"
            autoComplete="organization"
            placeholder="Nome da organização"
            value={values.empresa}
            onChange={(e) => updateField("empresa", e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="interesse">Tipo de interesse</Label>
        <Select
          id="interesse"
          name="interesse"
          value={values.interesse}
          onChange={(e) => updateField("interesse", e.target.value as FormValues["interesse"])}
          invalid={!!errors.interesse}
          aria-describedby={errors.interesse ? "interesse-error" : undefined}
        >
          <option value="" disabled>
            Selecione...
          </option>
          {CONTACT_INTERESSE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
        {errors.interesse && (
          <p id="interesse-error" role="alert" className="mt-1.5 text-sm text-danger">
            {errors.interesse}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="mensagem">Mensagem</Label>
        <Textarea
          id="mensagem"
          name="mensagem"
          placeholder="Conte um pouco sobre o seu projeto"
          value={values.mensagem}
          onChange={(e) => updateField("mensagem", e.target.value)}
          invalid={!!errors.mensagem}
          aria-describedby={errors.mensagem ? "mensagem-error" : undefined}
        />
        {errors.mensagem && (
          <p id="mensagem-error" role="alert" className="mt-1.5 text-sm text-danger">
            {errors.mensagem}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" isLoading={status === "submitting"}>
        {status === "submitting" ? "Enviando..." : "Enviar mensagem"}
      </Button>

      {status === "error" && (
        <p role="alert" className="text-center text-sm text-danger">
          Não foi possível enviar sua mensagem agora. Tente novamente em instantes.
        </p>
      )}

      <p className="text-sm leading-relaxed text-text-secondary">{contactSection.consent}</p>
    </form>
  );
}
