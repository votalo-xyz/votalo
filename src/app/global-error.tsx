"use client";

/**
 * Last-resort error page, used only when the root layout itself fails. It replaces the whole document,
 * so it cannot use the language, theme or components of the app: plain HTML in both languages instead.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const button = {
    minHeight: 44,
    padding: "0 24px",
    borderRadius: 999,
    border: "none",
    background: "#FF9F1C",
    color: "#1A1206",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  } as const;

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0D0B12",
          color: "#F4F1EA",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main style={{ maxWidth: 440, padding: 24 }}>
          <h1 style={{ fontSize: 28, lineHeight: 1.1, margin: "0 0 12px" }}>Algo salió mal · Something went wrong</h1>
          <p style={{ color: "#ABA4B8", lineHeight: 1.5, margin: "0 0 8px" }}>
            Tuvimos un problema al mostrar esta página. Puedes intentarlo otra vez.
          </p>
          <p style={{ color: "#ABA4B8", lineHeight: 1.5, margin: "0 0 24px" }}>
            We had a problem showing this page. You can try again.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={reset} style={button}>
              Intentar de nuevo · Try again
            </button>
            {/* A plain link on purpose: the app's router may be what broke, so go home with a full page load. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ color: "#FFB454", fontWeight: 600, minHeight: 44, display: "inline-flex", alignItems: "center" }}>
              Inicio · Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
