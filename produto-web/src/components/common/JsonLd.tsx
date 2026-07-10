export interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  // Escapa "<" para impedir que um "</script>" dentro do valor encerre a tag
  // prematuramente (defense-in-depth — os dados são estáticos hoje, mas se
  // algum campo passar a vir de API/CMS, isso evita um vetor de XSS).
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
