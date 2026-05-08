import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="reveal flex items-baseline gap-4 sm:gap-6 mb-8 sm:mb-12">
      <span
        className="section-num font-serif text-[13px] font-light tracking-logo flex-shrink-0"
        style={{ color: 'var(--gold-text)' }}
        dir="ltr"
      >
        {num}
      </span>
      <h2
        className="font-serif text-[22px] sm:text-[28px] font-light tracking-heading flex-shrink-0"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h2>
      <div className="divider-shimmer flex-1 h-px" style={{ background: 'var(--gold-dim)' }} />
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
      <section className="hero-grain relative min-h-[80vh] flex flex-col items-center justify-center px-4 sm:px-6 text-center">
        <p
          className="animate-hero-enter font-serif text-5xl sm:text-7xl tracking-logo leading-none"
          dir="ltr"
        >
          <span className="font-light" style={{ color: 'var(--text-display)' }}>TARSHEEH</span>
          <span className="font-normal" style={{ color: 'var(--gold)' }}>.CV</span>
        </p>

        <div
          className="animate-fade-up divider-shimmer w-14 h-px my-brand-xl"
          style={{ animationDelay: '200ms', background: 'var(--gold)' }}
        />

        <h1
          className="animate-fade-up font-serif text-3xl sm:text-4xl font-light tracking-display leading-tight whitespace-pre-line"
          style={{ animationDelay: '400ms', color: 'var(--text-primary)' }}
        >
          {t('hero')}
        </h1>

        <p
          className="animate-fade-up mt-brand-lg font-sans text-sm font-light w-full max-w-lg text-center leading-[1.75]"
          style={{ animationDelay: '600ms', color: 'var(--muted-light)' }}
        >
          {t('subHero')}
        </p>

        <div
          className="animate-fade-up flex items-center gap-4 mt-brand-xl"
          style={{ animationDelay: '800ms' }}
        >
          <Link
            href="/job"
            className="btn-glow font-sans text-[11px] font-normal uppercase tracking-logo py-3 px-8"
            style={{
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: '1px solid var(--btn-primary-bg)',
            }}
          >
            {t('ctaPrimary')}
          </Link>
          <Link
            href="#how-it-works"
            className="link-underline font-sans text-[11px] font-normal uppercase tracking-logo py-3 px-8 transition-colors duration-200"
            style={{
              color: 'var(--muted)',
            }}
          >
            {t('learnMore')}
          </Link>
        </div>
      </section>

      {/* ── Content sections ── */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pb-brand-2xl">

        {/* 01 — Mission */}
        <section
          id="problem"
          className="py-16"
          style={{ borderTop: '1px solid var(--gold-dim)' }}
        >
          <SectionHeader num={t('missionNum')} title={t('missionTitle')} />
          <p
            className="reveal font-serif text-[26px] font-light text-center w-full max-w-[32rem] mx-auto leading-relaxed"
            style={{ color: 'var(--muted-light)' }}
          >
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
          <p
            className="reveal font-sans text-sm font-light text-center mb-8"
            style={{ color: 'var(--muted-light)' }}
          >
            {t('howItWorksIntro')}
          </p>
          <div className="reveal-stagger grid grid-cols-2 sm:grid-cols-5 gap-[2px]">
            {pipelineStages.map((stage) => (
              <div
                key={stage}
                className="reveal pipeline-stage text-center p-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--gold-faint)' }}
              >
                <div
                  className="font-serif text-[15px] font-light"
                  style={{ color: 'var(--text-primary)' }}
                >
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
          <div className="reveal-stagger grid grid-cols-1 sm:grid-cols-3 gap-[2px]">
            {featureCards.map(({ phrase, sub }) => (
              <div
                key={phrase}
                className="reveal feature-card p-6"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--gold-dim)' }}
              >
                <p
                  className="font-serif text-[18px] font-light leading-snug tracking-[0.02em] mb-3"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {phrase}
                </p>
                <p
                  className="font-sans text-xs font-light leading-relaxed"
                  style={{ color: 'var(--muted-light)' }}
                >
                  {sub}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section
          className="reveal py-16 flex flex-col items-center"
          style={{ borderTop: '1px solid var(--gold-dim)' }}
        >
          <p
            className="font-serif text-[22px] sm:text-[28px] font-light tracking-heading mb-brand-xl text-center"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('closingCta')}
          </p>
          <Link
            href="/job"
            className="btn-glow font-sans text-[11px] font-normal uppercase tracking-logo py-3 px-8"
            style={{
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: '1px solid var(--btn-primary-bg)',
            }}
          >
            {t('ctaPrimary')}
          </Link>
        </section>

      </div>
    </div>
  );
}
