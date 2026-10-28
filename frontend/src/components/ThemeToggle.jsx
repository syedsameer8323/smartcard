import { useTheme } from "../utils/theme.js";
import { Moon, Sun } from "./Glyphs.jsx";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button type="button" className="icon-btn theme-toggle" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}>
      {dark ? <Sun /> : <Moon />}
    </button>
  );
}
