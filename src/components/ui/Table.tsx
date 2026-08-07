import { cn } from "@/lib/utils";

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn("min-w-full divide-y divide-white/10", className)}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("bg-white/[0.02]", className)} {...props} />
  );
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn("divide-y divide-white/[0.06] bg-transparent", className)}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("hover:bg-white/[0.03]", className)} {...props} />;
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-6 py-4 text-sm text-zinc-300",
        className,
      )}
      {...props}
    />
  );
}

export function TableHeaderCell({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500",
        className,
      )}
      {...props}
    />
  );
}
