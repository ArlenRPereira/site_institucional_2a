import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid}
      className={cn(
        "w-full rounded-lg border border-border-strong bg-surface px-4 py-3 text-base text-text-primary placeholder:text-text-disabled transition-colors duration-normal focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand-500/20",
        invalid && "border-danger focus:border-danger focus:ring-danger/20",
        className
      )}
      {...props}
    />
  );
}
