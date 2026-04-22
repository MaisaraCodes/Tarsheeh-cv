import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-baseline gap-6 mb-12">
      <span
        className="font-serif text-[13px] font-light text-gold tracking-logo flex-shrink-0"
        dir="ltr"
      >
        {num}
      </span>
      <h2 className="font-serif text-[28px] font-light text-ivory tracking-heading flex-shrink-0">
        {title}
      </h2>
      <div className="flex-1 h-px" style={{ background: 'var(--gold-dim)' }} />
    </div>
  );
}

export default async function Home() {
  const t = await getTranslations('landing');

  const pipelineStages = [
    t('pipelineIntake'),
    t('pipelineScreening'),
    t('pipelineRanking'),
    t('pipelineInterview'),
    t('pipelineReport'),
  ];

  const featureCards = [
    { phrase: t('screeningPhrase'), sub: t('screeningSub') },
    { phrase: t('rankingPhrase'),   sub: t('rankingSub') },
    { phrase: t('interviewPhrase'), sub: t('interviewSub') },
  ];

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
        <p
          className="animate-hero-enter font-serif text-7xl tracking-logo leading-none"
          dir="ltr"
        >
          <span className="font-light text-gold-pale">TARSHEEH</span>
          <span className="font-normal text-gold">.CV</span>
        </p>

        <div
          className="animate-fade-up w-14 h-px bg-gold my-brand-xl"
          style={{ animationDelay: '200ms' }}
        />

        <h1
          className="animate-fade-up font-serif text-4xl font-light text-ivory tracking-display leading-tight whitespace-pre-line"
          style={{ animationDelay: '400ms' }}
        >
          {t('hero')}
        </h1>

        <p
          className="animate-fade-up mt-brand-lg font-sans text-sm font-light text-muted-light w-full max-w-lg text-center leading-[1.75]"
          style={{ animationDelay: '600ms' }}
        >
          {t('subHero')}
        </p>

        <div
          className="animate-fade-up flex items-center gap-4 mt-brand-xl"
          style={{ animationDelay: '800ms' }}
        >
          <Link
            href="/job"
            className="font-sans text-[11px] font-normal uppercase tracking-logo text-noir bg-gold py-3 px-8 active:scale-[0.98] transition-transform duration-75"
            style={{ border: '1px solid var(--color-gold)' }}
          >
            {t('ctaPrimary')}
          </Link>
          <Link
            href="#how-it-works"
            className="font-sans text-[11px] font-normal uppercase tracking-logo text-muted py-3 px-8 transition-colors duration-200 hover:text-ivory"
            style={{
              textDecoration: 'underline',
              textDecorationColor: 'var(--gold-dim)',
              textUnderlineOffset: '3px',
            }}
          >
            {t('learnMore')}
          </Link>
        </div>
      </section>

      {/* ── Content sections ── */}
      <div className="max-w-4xl mx-auto w-full px-6 pb-brand-2xl">

        {/* 01 — Mission */}
        <section
          id="problem"
          className="py-16"
          style={{ borderTop: '1px solid var(--gold-dim)' }}
        >
          <SectionHeader num={t('missionNum')} title={t('missionTitle')} />
          <p className="font-serif text-[26px] font-light text-muted-light text-center w-full max-w-[32rem] mx-auto leading-relaxed">
            {t('missionBody')}
          </p>
        </section>

        {/* 02 — How It Works */}
        <section
          id="how-it-works"
          className="py-16"
          style={{ borderTop: '1px solid var(--gold-dim)' }}
        >
          <SectionHeader num={t('howItWorksNum')} title={t('howItWorksTitle')} />
          <p className="font-sans text-sm font-light text-muted-light text-center mb-8">
            {t('howItWorksIntro')}
          </p>
          <div className="grid grid-cols-5 gap-[2px]">
            {pipelineStages.map((stage) => (
              <div
                key={stage}
                className="bg-noir-2 text-center p-4"
                style={{ border: '1px solid var(--gold-faint)' }}
              >
                <div className="font-serif text-[15px] font-light text-ivory">
                  {stage}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 03 — What You Get */}
        <section
          id="features"
          className="py-16"
          style={{ borderTop: '1px solid var(--gold-dim)' }}
        >
          <SectionHeader num={t('featuresNum')} title={t('featuresTitle')} />
          <div className="grid grid-cols-3 gap-[2px]">
            {featureCards.map(({ phrase, sub }) => (
              <div
                key={phrase}
                className="bg-noir-3 p-6"
                style={{ border: '1px solid var(--gold-dim)' }}
              >
                <p className="font-serif text-[18px] font-light text-ivory leading-snug tracking-[0.02em] mb-3">
                  {phrase}
                </p>
                <p className="font-sans text-xs font-light text-muted-light leading-relaxed">
                  {sub}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section
          className="py-16 flex flex-col items-center"
          style={{ borderTop: '1px solid var(--gold-dim)' }}
        >
          <p className="font-serif text-[28px] font-light text-ivory tracking-heading mb-brand-xl">
            {t('closingCta')}
          </p>
          <Link
            href="/job"
            className="font-sans text-[11px] font-normal uppercase tracking-logo text-noir bg-gold py-3 px-8 active:scale-[0.98] transition-transform duration-75"
            style={{ border: '1px solid var(--color-gold)' }}
          >
            {t('ctaPrimary')}
          </Link>
        </section>

      </div>
    </div>
  );
}
