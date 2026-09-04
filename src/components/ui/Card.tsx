import { cn } from "@/lib/utils";

// VISUAL-03A: Card hierarchy — primary (elevated), secondary (quiet), contextual (subtle/dashed)
// Default remains primary for backward compat; explicit variant prop for new code.
type CardVariant = "primary" | "secondary" | "contextual";

const variantClasses: Record<CardVariant, string> = {
  primary: "platform-card-primary",
  secondary: "platform-card-secondary",
  contextual: "platform-card-contextual",
};

export function Card({
  className,
  variant = "primary",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return <div className={cn(variantClasses[variant], className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-[var(--border-subtle)] px-6 py-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-lg font-semibold tracking-tight text-[var(--text-primary)]", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-t border-[var(--border-subtle)] px-6 py-4", className)}
      {...props}
    />
  );
}
