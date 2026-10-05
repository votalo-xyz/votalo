"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type ShellHeader = { title: string | null; backHref: string | null };

const HeaderContext = createContext<{
  header: ShellHeader;
  set: (header: ShellHeader) => void;
}>({ header: { title: null, backHref: null }, set: () => {} });

export function ShellHeaderProvider({ children }: { children: ReactNode }) {
  const [header, set] = useState<ShellHeader>({ title: null, backHref: null });
  const value = useMemo(() => ({ header, set }), [header]);
  return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>;
}

export function useShellHeader() {
  return useContext(HeaderContext).header;
}

/** Renders nothing. Puts a title (and an optional back link) in the app shell's top bar while mounted. */
export function ShellTitle({ title, backHref = null }: { title: string | null; backHref?: string | null }) {
  const { set } = useContext(HeaderContext);
  useEffect(() => {
    set({ title, backHref });
    return () => set({ title: null, backHref: null });
  }, [title, backHref, set]);
  return null;
}
