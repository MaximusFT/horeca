"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-[#f4f5f2] px-6">
      <div className="w-full max-w-md rounded-2xl border border-[#efd2cc] bg-white p-8 text-center shadow-[0_1px_2px_rgba(24,37,29,.03)]">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-[#a65243] text-lg font-black text-white">!</div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#a65243]">Something went wrong</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#18251d]">The procurement cockpit hit an error</h1>
        <p className="mt-3 text-sm leading-6 text-[#65736a]">The deterministic plan itself is unaffected. You can retry this page or reset the shared demo from the sidebar.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={reset} className="flex h-11 items-center justify-center rounded-xl bg-[#1c5b37] px-4 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(28,91,55,.18)]">
            Try again
          </button>
          <Link href="/overview" className="flex h-11 items-center justify-center rounded-xl border border-[#d7ddd7] px-4 text-sm font-semibold text-[#456b53]">
            Back to Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
