import { TAGLINES } from "@/lib/brand";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="font-serif text-7xl tracking-logo leading-none">
        <span className="font-light text-gold-pale">TARSHEEH</span>
        <span className="font-normal text-gold">.CV</span>
      </p>

      <div className="w-14 h-px bg-gold my-brand-xl" />

      <h1 className="font-serif text-4xl font-light text-ivory tracking-display leading-tight whitespace-pre-line">
        {TAGLINES.hero}
      </h1>

      <p className="mt-brand-lg font-sans text-sm font-light text-muted-light w-full max-w-lg text-center leading-[1.75]">
        {TAGLINES.subHero}
      </p>
    </div>
  );
}
