import { notFound } from "next/navigation";

// Any URL no page claims lands here, so the styled not-found page renders inside the layout.
export default function CatchAll() {
  notFound();
}
