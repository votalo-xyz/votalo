"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "./skeleton";

/**
 * Client components on purpose: a loading.tsx cannot set the request locale, so reading messages on the
 * server here would make every page under it render on demand instead of being prerendered.
 *
 * Placeholders shown by the routes' loading.tsx files while a page streams in. They copy the shape of the
 * real page so nothing jumps when it arrives, and say "Loading" to screen readers instead of spinning.
 */
function Busy({ children, className }: { children: React.ReactNode; className?: string }) {
  const t = useTranslations("Common");
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{t("loading")}</span>
      {children}
    </div>
  );
}

/** A heading and a few cards: Groups, Me, Start. */
export function ListSkeleton() {
  return (
    <Busy className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-2/3 max-w-sm" />
        <Skeleton className="h-5 w-full max-w-md" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </div>
    </Busy>
  );
}

/** A heading and a form: Create group, New vote. */
export function FormSkeleton() {
  return (
    <Busy className="mx-auto flex max-w-xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-full" />
      </div>
      <Skeleton className="h-14 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-3xl" />
      <Skeleton className="h-28 w-full rounded-3xl" />
      <Skeleton className="h-14 w-48 rounded-full" />
    </Busy>
  );
}

/** Group page: badges, name, actions, and a list of votes. */
export function GroupSkeleton() {
  return (
    <Busy className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-11 w-56 rounded-full" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-3xl" />
      </div>
    </Busy>
  );
}

/** Proposal page: the living ring and the option cards. */
export function ProposalSkeleton() {
  return (
    <Busy className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="grid gap-6 md:grid-cols-[17rem_1fr]">
        <Skeleton className="mx-auto aspect-square w-full max-w-[12.5rem] rounded-full md:max-w-none" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>
    </Busy>
  );
}

/** My standing: badge, tiles, history. */
export function StandingSkeleton() {
  return (
    <Busy className="flex flex-col gap-8">
      <div className="flex items-center gap-5">
        <Skeleton className="size-28 shrink-0 rounded-[2rem]" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="col-span-2 h-20 rounded-2xl sm:col-span-1" />
      </div>
      <Skeleton className="h-24 w-full rounded-3xl" />
    </Busy>
  );
}
