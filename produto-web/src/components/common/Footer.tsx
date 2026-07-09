import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { mainNav, footerInstitucional } from "@/data/navigation";
import { company } from "@/data/company";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

export function Footer() {
  // Avaliado no build (home é estática) → atualiza a cada deploy de produção.
  const now = new Date();
  const year = now.getFullYear();
  const versaoLabel = `Versão ${process.env.NEXT_PUBLIC_APP_VERSION} — ${MESES[now.getMonth()]} de ${year}`;

  return (
    <footer className="bg-surface-dark">
      <Container className="py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Logo size={72} />
            <p className="mt-4 max-w-xs text-base text-text-on-dark-secondary">
              Tecnologia, inovação e impacto social para empresas e governos.
            </p>
            <p className="mt-6 text-sm text-text-on-dark-muted">{versaoLabel}</p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-white">Navegação</h3>
            <ul className="mt-4 space-y-3">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-base text-text-on-dark-secondary transition-colors duration-normal hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold text-white">Institucional</h3>
            <ul className="mt-4 space-y-3">
              {footerInstitucional.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-base text-text-on-dark-secondary transition-colors duration-normal hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border-dark pt-8 text-center text-sm text-text-on-dark-muted">
          © {year} {company.legalName}. Todos os direitos reservados.
        </div>
      </Container>
    </footer>
  );
}
