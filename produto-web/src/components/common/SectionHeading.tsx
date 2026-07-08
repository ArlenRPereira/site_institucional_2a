import { cn } from "@/lib/utils";

export interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  /** Estilo para uso sobre fundo escuro (hero, diferenciais). @default false */
  onDark?: boolean;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  onDark = false,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn(align === "center" && "mx-auto max-w-3xl text-center", className)}>
      <p
        className={cn(
          "text-sm font-bold uppercase tracking-widest",
          onDark ? "text-brand-300" : "text-brand-600"
        )}
      >
        {eyebrow}
      </p>
      <h2
        className={cn(
          "mt-3 text-3xl font-bold tracking-tight sm:text-4xl",
          onDark ? "text-white" : "text-text-primary"
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={cn("mt-4 text-lg leading-relaxed", onDark ? "text-text-on-dark-secondary" : "text-text-secondary")}>
          {description}
        </p>
      )}
    </div>
  );
}
