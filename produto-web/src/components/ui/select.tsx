import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function Select({ className, invalid, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid}
        className={cn(
          "w-full appearance-none rounded-lg border border-border-strong bg-surface px-4 py-3 pr-10 text-base text-text-primary transition-colors duration-normal focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand-500/20",
          invalid && "border-danger focus:border-danger focus:ring-danger/20",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
      >
        <path d="M5.25 7.5L10 12.25l4.75-4.75" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
