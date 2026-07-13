export const APPEARANCE_STORAGE_KEY = "sipi-appearance";

export const APPEARANCE_OPTIONS = ["default", "light", "black"] as const;

export type Appearance = (typeof APPEARANCE_OPTIONS)[number];

export function isAppearance(value: string | null): value is Appearance {
  return APPEARANCE_OPTIONS.includes(value as Appearance);
}

export function getStoredAppearance(): Appearance {
  if (typeof window === "undefined") return "default";

  try {
    const stored = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    return isAppearance(stored) ? stored : "default";
  } catch {
    return "default";
  }
}

export function applyAppearance(appearance: Appearance) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.dataset.theme = appearance;
  root.classList.toggle("dark", appearance !== "light");
  root.style.colorScheme = appearance === "light" ? "light" : "dark";
}

export const appearanceInitScript = `
  (() => {
    const storageKey = ${JSON.stringify(APPEARANCE_STORAGE_KEY)};
    const allowed = ${JSON.stringify(APPEARANCE_OPTIONS)};
    let appearance = "default";

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (allowed.includes(stored)) appearance = stored;
    } catch {}

    const root = document.documentElement;
    root.dataset.theme = appearance;
    root.classList.toggle("dark", appearance !== "light");
    root.style.colorScheme = appearance === "light" ? "light" : "dark";
  })();
`;
