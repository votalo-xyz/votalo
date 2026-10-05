import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

/** Shared look for buttons and for links that should look like buttons. 44 px minimum touch target. */
export const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[transform,background-color,border-color,color,opacity] duration-200 ease-[var(--ease-spring)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg shadow-card hover:bg-accent-hover",
        secondary: "border border-line-strong bg-surface text-fg hover:bg-surface-2",
        ghost: "text-fg hover:bg-surface-2",
        identity: "bg-identity text-bg hover:opacity-90",
      },
      size: {
        sm: "min-h-11 px-4 text-sm",
        md: "min-h-12 px-6 text-base",
        lg: "min-h-14 px-8 text-lg",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & ButtonVariants) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
