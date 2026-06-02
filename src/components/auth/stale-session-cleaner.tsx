"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type StaleSessionCleanerProps = {
  shouldClear: boolean;
};

export function StaleSessionCleaner({ shouldClear }: StaleSessionCleanerProps) {
  const router = useRouter();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!shouldClear || hasStarted.current) {
      return;
    }

    hasStarted.current = true;

    signOut({ redirect: false })
      .catch(() => {
        // A failed sign-out must not restart the login/dashboard redirect loop.
      })
      .finally(() => {
        const nextUrl = `/login?session=expired&nocache=${Date.now()}`;
        router.replace(nextUrl);
        router.refresh();
      });
  }, [router, shouldClear]);

  return null;
}
