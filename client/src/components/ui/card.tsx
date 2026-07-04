import * as React from "react";

import { cn } from "@/lib/utils";

type CardVariant = "default" | "feature" | "report";

const cardVariants: Record<CardVariant, string> = {
  default:
    "border-[var(--zs-line)] bg-[var(--zs-card)] text-[var(--zs-ink)] shadow-[var(--zs-shadow-card)]",
  feature:
    "border-[rgba(201,162,75,.42)] bg-[var(--zs-card)] text-[var(--zs-ink)] shadow-[var(--zs-shadow-float)]",
  report:
    "border-[var(--zs-report-border)] bg-[image:var(--zs-report-bg)] text-[var(--zs-report-text)] shadow-[var(--zs-shadow-report)]",
};

function Card({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: CardVariant;
}) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-6 rounded-[var(--zs-radius-card)] border py-6",
        cardVariants[variant],
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-[var(--zs-type-h3-size)] font-bold leading-[var(--zs-type-h3-leading)]", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm leading-[var(--zs-leading-relaxed)] text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
