"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "./cn";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;
export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;

type Side = "right" | "bottom";

/** Slide-in panel. `right` for the mobile menu, `bottom` for share and confirm sheets. */
export function SheetContent({
  className,
  side = "right",
  children,
  ...props
}: React.ComponentProps<typeof Dialog.Content> & { side?: Side }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm data-[state=closed]:animate-[fade-out_160ms_ease-in_forwards] data-[state=open]:animate-[fade-in_200ms_ease-out]" />
      <Dialog.Content
        className={cn(
          "fixed z-[70] flex flex-col bg-bg text-fg shadow-pop outline-none",
          side === "right" &&
            "inset-y-0 right-0 w-[min(88vw,24rem)] border-l border-line data-[state=closed]:animate-[sheet-out-right_180ms_ease-in_forwards] data-[state=open]:animate-[sheet-in-right_320ms_var(--ease-spring)]",
          side === "bottom" &&
            "inset-x-0 bottom-0 mx-auto max-h-[92dvh] w-full max-w-lg rounded-t-4xl border border-b-0 border-line safe-bottom data-[state=closed]:animate-[sheet-out-bottom_180ms_ease-in_forwards] data-[state=open]:animate-[sheet-in-bottom_340ms_var(--ease-spring)]",
          className,
        )}
        {...props}
      >
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
