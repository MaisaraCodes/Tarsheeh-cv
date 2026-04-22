import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Strip Accept-Language so next-intl falls back to the NEXT_LOCALE cookie
  // (set when the user explicitly switches via LanguageToggle) or the
  // defaultLocale ('ar'). This makes new visitors land on AR regardless of
  // browser language, while still preserving an explicit user choice.
  const headers = new Headers(request.headers);
  headers.delete('accept-language');

  const stripped = new NextRequest(request, { headers });
  return intlMiddleware(stripped);
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
