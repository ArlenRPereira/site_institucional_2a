import { cn } from "@/lib/utils";

function CardRoot({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-surface p-6 shadow-sm", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-xl font-semibold text-text-primary", className)} {...props} />;
}

function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-3 text-base leading-relaxed text-text-secondary", className)} {...props} />;
}

export const Card = Object.assign(CardRoot, {
  Title: CardTitle,
  Body: CardBody,
});
