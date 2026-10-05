"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";
import { cn } from "./cn";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("border-b border-line last:border-b-0", className)} {...props} />;
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "group flex min-h-14 flex-1 items-center justify-between gap-4 py-4 text-left text-lg font-semibold leading-snug transition-colors hover:text-accent-text",
          className,
        )}
        {...props}
      >
        {children}
        <Plus
          aria-hidden="true"
          className="size-5 shrink-0 text-muted transition-transform duration-300 ease-[var(--ease-spring)] group-data-[state=open]:rotate-45"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden data-[state=closed]:animate-[acc-up_220ms_ease-out] data-[state=open]:animate-[acc-down_280ms_ease-out]"
      {...props}
    >
      <div className={cn("pb-5 pr-8 text-muted", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
