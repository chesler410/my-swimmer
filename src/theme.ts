// Theme: Auto (follow device), Light, or Dark (forced). Applied as a class on <html>.
export type Theme = "auto" | "light" | "dark";

export const getTheme = (): Theme => (localStorage.getItem("theme") as Theme) || "auto";

function resolve(t: Theme): "light" | "dark" {
  if (t !== "auto") return t;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme() {
  const eff = resolve(getTheme());
  const el = document.documentElement;
  el.classList.toggle("theme-dark", eff === "dark");
  el.classList.toggle("theme-light", eff === "light");
}

export function setTheme(t: Theme) {
  localStorage.setItem("theme", t);
  applyTheme();
}

// Follow the device when in Auto.
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
  if (getTheme() === "auto") applyTheme();
});
