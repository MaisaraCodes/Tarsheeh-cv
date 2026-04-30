'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/i18n/navigation';

/**
 * Checks for an active Supabase session and redirects to /auth/signin if none.
 * Returns undefined while loading, null while redirecting, User when authenticated.
 */
export function useAuthGuard(): User | null | undefined {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (!session) {
        router.push('/auth/signin');
        setUser(null);
        return;
      }
      setUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!mounted) return;
      if (!session) {
        router.push('/auth/signin');
        setUser(null);
        return;
      }
      setUser(session.user);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // router from next-intl createNavigation is stable — safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return user;
}
