import Script from "next/script";

const themeScript = `
(() => {
  const storageKey = "deep-research-theme";
  const root = document.documentElement;
  const stored = window.localStorage.getItem(storageKey);
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = stored === "light" || stored === "dark" ? stored : systemPrefersDark ? "dark" : "light";
  root.dataset.theme = theme;
})();
`;

export function ThemeScript() {
  return <Script id="theme-script" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
