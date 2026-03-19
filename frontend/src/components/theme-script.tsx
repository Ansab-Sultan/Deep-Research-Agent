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
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
