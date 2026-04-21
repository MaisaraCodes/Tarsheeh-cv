'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COPY } from "@/lib/brand";

export default function Nav() {
  const pathname = usePathname();

  return (
    <div className="max-w-4xl mx-auto flex items-center justify-between">
      <Link
        href="/"
        className="font-serif text-xl tracking-logo leading-none"
      >
        <span className="font-light text-gold-pale">TARSHEEH</span>
        <span className="font-normal text-gold">.CV</span>
      </Link>
      {pathname?.startsWith("/results/") && (
        <Link
          href="/job"
          className="font-sans text-[11px] font-normal uppercase tracking-logo text-noir bg-gold py-3 px-8 active:scale-[0.98] transition-transform duration-75"
          style={{ border: "1px solid var(--color-gold)" }}
        >
          {COPY.ctaPrimary}
        </Link>
      )}
    </div>
  );
}
