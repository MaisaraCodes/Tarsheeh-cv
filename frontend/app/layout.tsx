import type { Metadata } from "next";
import "./globals.css";
import { TAGLINES } from "@/lib/brand";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Tarsheeh.cv",
  description: "Intelligent Talent Acquisition",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header
          className="px-6 py-4"
          style={{ borderBottom: "1px solid var(--gold-dim)" }}
        >
          <Nav />
        </header>

        <main className="flex-1 flex flex-col">{children}</main>

        <footer
          className="px-6 py-8"
          style={{ borderTop: "1px solid var(--gold-dim)" }}
        >
          <div className="max-w-4xl mx-auto flex items-start justify-between">
            <div>
              <p className="font-serif text-xl tracking-logo leading-none">
                <span className="font-light text-gold-pale">TARSHEEH</span>
                <span className="font-normal text-gold">.CV</span>
              </p>
              <p className="font-sans text-[10px] font-light text-muted-light uppercase tracking-wide mt-2">
                {TAGLINES.platform}
              </p>
            </div>
            <p className="font-sans text-[10px] font-light text-muted uppercase tracking-wide text-right">
              Team Nexus · Agenticthon 2026 · Internal Use Only
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
