"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type FmAppearanceMode = "system" | "light" | "dark";
export type FmResolvedAppearance = "light" | "dark";

const FM_APPEARANCE_STORAGE_KEY = "fmweb:appearance-mode";

function normalizeAppearanceMode(value: unknown): FmAppearanceMode {
  const token = String(value ?? "").trim().toLowerCase();
  if (token === "light" || token === "dark") {
    return token;
  }
  return "system";
}

function detectSystemDarkMode(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveAppearance(mode: FmAppearanceMode, prefersDark: boolean): FmResolvedAppearance {
  if (mode === "light") {
    return "light";
  }
  if (mode === "dark") {
    return "dark";
  }
  return prefersDark ? "dark" : "light";
}

export function useFmAppearance() {
  const [appearanceMode, setAppearanceModeState] = useState<FmAppearanceMode>("system");
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedMode = normalizeAppearanceMode(window.localStorage.getItem(FM_APPEARANCE_STORAGE_KEY));
    setAppearanceModeState(storedMode);
    setPrefersDark(detectSystemDarkMode());

    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersDark(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const resolvedAppearance = useMemo(
    () => resolveAppearance(appearanceMode, prefersDark),
    [appearanceMode, prefersDark]
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.dataset.fmAppearance = resolvedAppearance;
  }, [resolvedAppearance]);

  const setAppearanceMode = useCallback((mode: FmAppearanceMode) => {
    const normalized = normalizeAppearanceMode(mode);
    setAppearanceModeState(normalized);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FM_APPEARANCE_STORAGE_KEY, normalized);
    }
  }, []);

  return {
    appearanceMode,
    resolvedAppearance,
    setAppearanceMode
  };
}
