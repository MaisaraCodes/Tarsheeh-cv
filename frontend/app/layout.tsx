import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { COPY, TAGLINES } from "@/lib/brand";

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
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link
              href="/"
              className="font-serif text-xl tracking-logo leading-none"
            >
              <span className="font-light text-gold-pale">TARSHEEH</span>
              <span className="font-normal text-gold">.CV</span>
            </Link>
            <Link
              href="/job"
              className="font-sans text-[11px] font-normal uppercase tracking-logo text-noir bg-gold py-3 px-8"
              style={{ border: "1px solid var(--color-gold)" }}
            >
              {COPY.ctaPrimary}
            </Link>
          </div>
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
