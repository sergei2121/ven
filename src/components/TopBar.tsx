import { useEffect, useState } from "react";
import { SERVERS, TOTAL_CAMS } from "../data";
import { hhmmss, useNow } from "../ui";

const NAV = [
  ["#wall", "Стена"],
  ["#servers", "Серверы"],
  ["#templates", "Шаблоны"],
  ["#arch", "Архитектура"],
  ["#calc", "Расчёт"],
  ["#archive", "Архив"],
  ["#stack", "Сборка"],
] as const;

function Uptime() {
  const [sec, setSec] = useState(47 * 86400 + 12 * 3600 + 8 * 60 + 31);
  useEffect(() => {
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const d = Math.floor(sec / 86400);
  const h = String(Math.floor((sec % 86400) / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  return (
    <span className="font-mono text-[11px] text-mut">
      uptime <span className="text-green">{d}сут {h}:{m}</span>
    </span>
  );
}

export default function TopBar() {
  const now = useNow();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const online = SERVERS.filter((s) => s.status === "online").length;

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-bg0/85 backdrop-blur-md">
      <div
        className="absolute left-0 top-0 h-[2px] bg-gradient-to-r from-cyan via-amber to-amber"
        style={{ width: `${progress}%` }}
      />
      <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-4 px-4 md:px-8">
        <a href="#wall" className="group flex items-center gap-3">
          <span className="relative grid h-9 w-9 place-items-center border border-amber/60 bg-panel">
            <svg viewBox="0 0 32 32" className="h-6 w-6 transition-transform duration-700 group-hover:rotate-[360deg]">
              <circle cx="16" cy="15" r="8.5" fill="none" stroke="#FFB224" strokeWidth="2" />
              <circle cx="16" cy="15" r="3" fill="#3DDCF0" />
              <ellipse cx="16" cy="15" rx="13.5" ry="4.5" fill="none" stroke="#3DDCF0" strokeWidth="1.6" transform="rotate(-20 16 15)" />
              <path d="M27 5.5v.01M6 26v.01" stroke="#FFB224" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="leading-none">
            <span className="block font-disp text-xl tracking-[0.18em] text-ink">ВЕНЕРА</span>
            <span className="block font-mono text-[9px] uppercase tracking-[0.3em] text-dim">
              cluster vms · v2.0
            </span>
          </span>
        </a>

        <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
          {NAV.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="border border-transparent px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-mut transition-colors hover:border-cyan/40 hover:bg-cyan/5 hover:text-cyan"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden items-center gap-3 xl:flex">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-green">
              <span className="h-1.5 w-1.5 rounded-full bg-green pulse-dot" />
              {online}/70 СЕРВЕРОВ
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-red">
              <span className="h-1.5 w-1.5 rounded-full bg-red blink" />
              REC {TOTAL_CAMS.toLocaleString("ru-RU")}
            </span>
            <Uptime />
          </div>
          <div className="border border-line bg-panel px-3 py-1.5 text-right leading-none">
            <div className="font-mono text-sm font-bold tracking-widest text-cyan">{hhmmss(now)}</div>
            <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-dim">
              {now.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })} · MSK
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
