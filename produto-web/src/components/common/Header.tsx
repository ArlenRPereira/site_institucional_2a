"use client";

import { useState } from "react";
import Link from "next/link";
import { mainNav } from "@/data/navigation";
import { Logo } from "@/components/ui/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="#inicio" className="shrink-0" onClick={() => setIsMenuOpen(false)}>
          <Logo withWordmark />
        </Link>

        <nav aria-label="Navegação principal" className="hidden items-center gap-8 lg:flex">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-text-primary transition-colors duration-normal hover:text-brand-600"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="#contato" className={cn(buttonVariants({ variant: "primary", size: "sm" }), "hidden lg:inline-flex")}>
          Solicitar contato
        </Link>

        <button
          type="button"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setIsMenuOpen((open) => !open)}
          className="inline-flex size-10 items-center justify-center rounded-lg text-text-primary transition-colors duration-normal hover:bg-surface-raised lg:hidden"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
            {isMenuOpen ? (
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </button>
      </div>

      {isMenuOpen && (
        <nav aria-label="Navegação móvel" className="border-t border-border bg-surface px-4 pb-6 pt-2 lg:hidden">
          <ul className="flex flex-col">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block py-3 text-base font-medium text-text-primary transition-colors duration-normal hover:text-brand-600"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="#contato"
            onClick={() => setIsMenuOpen(false)}
            className={cn(buttonVariants({ variant: "primary" }), "mt-2 w-full")}
          >
            Solicitar contato
          </Link>
        </nav>
      )}
    </header>
  );
}
