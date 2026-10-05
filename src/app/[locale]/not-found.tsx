import { Footer } from "@/components/layout/footer";
import { NotFoundContent } from "@/components/layout/not-found-content";
import { Navbar } from "@/components/layout/navbar";

/** Fallback for anything the marketing and app areas do not catch. */
export default function NotFound() {
  return (
    <>
      <Navbar />
      <main id="main">
        <NotFoundContent />
      </main>
      <Footer />
    </>
  );
}
