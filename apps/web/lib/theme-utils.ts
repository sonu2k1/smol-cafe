/**
 * Smol Café — Day & Night Theme Manager (IST Timed Auto-Switch)
 * Automatically enables Dark Mode from 6:00 PM (18:00) to 4:00 AM (04:00) IST (Asia/Kolkata).
 * Supports manual user overrides and live periodic checks.
 */

export function isISTNightTime(): boolean {
  try {
    const istHourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    }).format(new Date());
    const istHour = parseInt(istHourStr, 10);
    // 6:00 PM (18:00) to 4:00 AM (04:00)
    return istHour >= 18 || istHour < 4;
  } catch {
    // Fallback manual UTC+5:30 computation
    const utc = Date.now() + new Date().getTimezoneOffset() * 60000;
    const istDate = new Date(utc + 3600000 * 5.5);
    const istHour = istDate.getHours();
    return istHour >= 18 || istHour < 4;
  }
}

export function resolveEffectiveTheme(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const saved = localStorage.getItem("smol_theme");
    if (saved === "night" || saved === "dark") return true;
    if (saved === "day" || saved === "light") return false;
    return isISTNightTime();
  } catch {
    return isISTNightTime();
  }
}

export function applyThemeToDOM(dark: boolean): void {
  if (typeof document === "undefined") return;
  const targetColor = dark ? "#151110" : "#F3E7D3";
  if (dark) {
    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "night");
    document.body.style.backgroundColor = "#241F1C";
    document.body.style.color = "#F3E7D3";
  } else {
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-theme", "day");
    document.body.style.backgroundColor = "#F3E7D3";
    document.body.style.color = "#241F1C";
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", targetColor);
  }
}
