import Image from "next/image";
import { cn } from "@/lib/utils";

export interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Altura da marca em pixels.
   * @default 48
   */
  size?: number;
}

export function Logo({ className, size = 48, ...props }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)} {...props}>
      <Image
        src="/logo-2a.png"
        alt="2A Desenvolvimento e Tecnologia"
        width={261}
        height={207}
        priority
        style={{ height: size, width: "auto" }}
        className="shrink-0 rounded-lg shadow-sm"
      />
    </div>
  );
}
