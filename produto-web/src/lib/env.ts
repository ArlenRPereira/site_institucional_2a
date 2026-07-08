function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

export const env = {
  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },
  get n8nContactWebhookUrl() {
    return required("N8N_CONTACT_WEBHOOK_URL");
  },
  get n8nContactWebhookToken() {
    return required("N8N_CONTACT_WEBHOOK_TOKEN");
  },
};
