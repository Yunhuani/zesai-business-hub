import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--zs-radius-button)] text-sm font-semibold leading-none transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(201,162,75,.28)] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--zs-primary)] text-white shadow-[var(--zs-shadow-button)] hover:bg-[var(--zs-primary-2)]",
        gold:
          "bg-[var(--zs-gold)] text-[var(--zs-gold-ink)] shadow-[var(--zs-shadow-button)] hover:bg-[var(--zs-gold-hover)]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-[var(--zs-line)] bg-transparent text-[var(--zs-ink)] hover:bg-[var(--zs-primary-soft)]",
        outlineGold:
          "border border-[var(--zs-gold)] bg-transparent text-[var(--zs-gold-ink)] hover:bg-[var(--zs-gold-soft)]",
        secondary:
          "bg-[var(--zs-primary-soft)] text-[var(--zs-primary)] hover:bg-[rgba(31,61,50,.14)]",
        ghost:
          "text-[var(--zs-sub)] hover:bg-[var(--zs-primary-soft)] hover:text-[var(--zs-ink)]",
        link: "text-[var(--zs-primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-9 gap-1.5 rounded-[10px] px-4 has-[>svg]:px-3",
        lg: "h-12 rounded-[var(--zs-radius-button)] px-8 text-base has-[>svg]:px-6",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
