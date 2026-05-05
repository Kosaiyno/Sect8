"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const ROUTES_TO_WARM = ["/dashboard", "/market"];

export default function RouteWarmup() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    for (const route of ROUTES_TO_WARM) {
      if (route !== pathname) {
        router.prefetch(route);
      }
    }
  }, [pathname, router]);

  return null;
}