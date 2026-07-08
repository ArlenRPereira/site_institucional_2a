import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold", {
  variants: {
    variant: {
      "on-dark": "border border-white/10 bg-surface-dark-raised text-white",
      "on-light": "bg-brand-200 text-brand-700",
    },
  },
  defaultVariants: { variant: "on-dark" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span aria-hidden="true" className="size-2 rounded-full bg-brand-400" />}
      {children}
    </span>
  );
}
