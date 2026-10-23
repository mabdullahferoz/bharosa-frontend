// Tiny i18n layer. English text is the key, so a missing Urdu string falls back to English.
// Run `npm run i18n:check -w web` to list strings passed to t() that have no Urdu translation.
import { createContext, Fragment, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import { UR, UR_ENUM } from "./locales/ur";

export type Lang = "en" | "ur";
const LANG_KEY = "bharosa.lang";

// Module-level so plain helpers (formatters, labels) can translate without hooks.
// The provider remounts the tree when the language changes, so everything re-renders.
let current: Lang = "en";
export const getLang = () => current;
export const isUrdu = () => current === "ur";

type Vars = Record<string, string | number>;

export function t(text: string, vars?: Vars): string {
  let s = current === "ur" ? (UR[text] ?? text) : text;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
  return s;
}

/** Marks a string for translation where t() runs later (tables, nav). Returns it unchanged. */
export const msg = (s: string) => s;

/** Label for an API enum value (MAID, FULL_TIME, PENDING…) or a city name. */
export function enumLabel(value: string | null | undefined): string {
  if (!value) return "";
  if (current === "ur" && UR_ENUM[value]) return UR_ENUM[value];
  if (/^[A-Z_]+$/.test(value)) return value.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  return value;
}

export const dateLocale = () => (current === "ur" ? "ur-PK" : "en-PK");

interface I18nState {
  lang: Lang;
  /** Urdu is currently offered on worker and public screens only. */
  supported: boolean;
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nState>({ lang: "en", supported: true, setLang: () => undefined });

function storedLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "ur" || v === "en") return v;
  } catch {
    /* storage unavailable */
  }
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("ur") ? "ur" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [chosen, setChosen] = useState<Lang>(storedLang);
  const supported = !user || user.role === "WORKER";
  const lang: Lang = supported ? chosen : "en";
  current = lang;

  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    el.dir = lang === "ur" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: Lang) => {
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* storage unavailable */
    }
    setChosen(l);
  };

  return (
    <I18nContext.Provider value={{ lang, supported, setLang }}>
      <Fragment key={lang}>{children}</Fragment>
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);

/** Button that switches between English and Urdu. Hidden where Urdu isn't offered yet. */
export function LanguageToggle({ className = "btn btn-ghost btn-sm" }: { className?: string }) {
  const { lang, supported, setLang } = useI18n();
  if (!supported) return null;
  return (
    <button
      type="button"
      className={`${className} lang-toggle`}
      onClick={() => setLang(lang === "ur" ? "en" : "ur")}
      lang={lang === "ur" ? "en" : "ur"}
      aria-label={lang === "ur" ? "Switch to English" : "اردو میں دیکھیں"}
    >
      {lang === "ur" ? "English" : "اردو"}
    </button>
  );
}
