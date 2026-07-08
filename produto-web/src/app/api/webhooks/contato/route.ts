import { NextResponse } from "next/server";
import { contactFormSchema } from "@/lib/validations/contact";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Corpo da requisição inválido." }, { status: 400 });
  }

  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const honeypot =
    typeof body === "object" && body !== null && "website" in body && typeof body.website === "string"
      ? body.website
      : "";

  try {
    const n8nResponse = await fetch(env.n8nContactWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.n8nContactWebhookToken}`,
      },
      body: JSON.stringify({ ...parsed.data, website: honeypot }),
    });

    const payload = await n8nResponse.json().catch(() => null);

    if (!n8nResponse.ok) {
      return NextResponse.json(
        { success: false, message: payload?.message ?? "Não foi possível enviar sua mensagem agora." },
        { status: n8nResponse.status }
      );
    }

    return NextResponse.json(payload ?? { success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "Não foi possível enviar sua mensagem agora." },
      { status: 502 }
    );
  }
}
