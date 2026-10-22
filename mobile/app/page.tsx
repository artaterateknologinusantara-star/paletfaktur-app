"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Static export tidak punya server redirect; arahkan di sisi klien.
export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/");
  }, [router]);
  return null;
}
