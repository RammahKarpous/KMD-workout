"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const { signIn } = useAuthActions();
  const t = useTranslations("auth");
  const router = useRouter();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        const formData = new FormData(e.currentTarget);
        formData.set("flow", flow);
        signIn("password", formData)
          .then(() => {
            // Navigate explicitly instead of relying on proxy.ts's
            // authenticated-hits-/login redirect: that redirect races with
            // Convex Auth's own post-sign-in router-cache invalidation and
            // can leave the URL/history stuck on /login (home renders, but
            // usePathname() still reports /login, hiding BottomNav) until a
            // manual reload. A real client navigation avoids the race.
            router.replace("/");
          })
          .catch(() => {
            setError(flow === "signIn" ? t("invalid") : t("createFailed"));
          })
          .finally(() => setSubmitting(false));
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-semibold text-muted" htmlFor="email">
          {t("email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none focus:border-blue"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-semibold text-muted" htmlFor="password">
          {t("password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={flow === "signIn" ? "current-password" : "new-password"}
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none focus:border-blue"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-blue py-4 text-[15.5px] font-bold text-white disabled:opacity-40"
      >
        {flow === "signIn" ? t("signIn") : t("createAccount")}
      </button>
      <button
        type="button"
        onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
        className="text-[13.5px] font-semibold text-blue"
      >
        {flow === "signIn" ? t("switchToSignUp") : t("switchToSignIn")}
      </button>
    </form>
  );
}
