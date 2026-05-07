'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useTransition } from 'react';

export default function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = locale === 'ar' ? 'en' : 'ar';
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="font-sans text-[11px] font-normal uppercase tracking-logo transition-colors duration-200"
      style={{ color: 'var(--muted)', opacity: isPending ? 0.5 : 1 }}
    >
      {locale === 'ar' ? 'EN' : 'AR'}
    </button>
  );
}
