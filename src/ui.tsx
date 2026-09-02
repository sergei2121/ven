import { useEffect, useRef, useState, type ReactNode } from "react";

/* ---------- живые часы ---------- */
export function useNow(ms = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function hhmmss(d: Date): string {
  return d.toLocaleTimeString("ru-RU", { hour12: false });
}

/* ---------- scroll-reveal ---------- */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("on");
            io.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`rv ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ---------- заголовок раздела ---------- */
export function SectionHead({
  index,
  kicker,
  title,
  note,
}: {
  index: string;
  kicker: string;
  title: string;
  note?: string;
}) {
  return (
    <Reveal className="mb-10 md:mb-14">
      <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.25em] text-cyan uppercase">
        <span className="inline-block h-px w-10 bg-cyan/60" />
        <span>{index} // {kicker}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-disp text-3xl md:text-5xl uppercase leading-[1.05] tracking-wide text-ink">
          {title}
        </h2>
        {note && (
          <p className="max-w-md text-sm leading-relaxed text-mut border-l-2 border-line pl-4">
            {note}
          </p>
        )}
      </div>
    </Reveal>
  );
}

/* ---------- шкала ---------- */
export function Bar({
  value,
  max,
  color = "#ffb224",
  label,
}: {
  value: number;
  max: number;
  color?: string;
  label?: string;
}) {
  const pct = Math.min(100, Math.max(2, (value / max) * 100));
  const over = value > max;
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between font-mono text-[11px]">
          <span className="text-mut">{label}</span>
          <span style={{ color: over ? "#ff5d5d" : color }}>
            {Math.round((value / max) * 100)}%
          </span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-sm bg-line/60">
        <div
          className="h-full rounded-sm transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: over
              ? "linear-gradient(90deg,#ff5d5d,#ff9d5d)"
              : `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 10px ${over ? "#ff5d5d66" : color + "55"}`,
          }}
        />
      </div>
    </div>
  );
}

/* ---------- чип ---------- */
export function Chip({
  tone,
  children,
  dot = false,
}: {
  tone: "ok" | "warn" | "bad" | "info" | "idle";
  children: ReactNode;
  dot?: boolean;
}) {
  const map = {
    ok: "text-green border-green/40 bg-green/10",
    warn: "text-amber border-amber/40 bg-amber/10",
    bad: "text-red border-red/40 bg-red/10",
    info: "text-cyan border-cyan/40 bg-cyan/10",
    idle: "text-mut border-line bg-panel",
  }[tone];
  const dotMap = { ok: "bg-green", warn: "bg-amber", bad: "bg-red", info: "bg-cyan", idle: "bg-dim" }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider ${map}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotMap} ${tone === "bad" || tone === "ok" ? "pulse-dot" : ""}`} />}
      {children}
    </span>
  );
}

/* ---------- иконки ---------- */
export function Icon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    rec: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
      </>
    ),
    server: (
      <>
        <rect x="3" y="4" width="18" height="7" rx="1" />
        <rect x="3" y="13" width="18" height="7" rx="1" />
        <path d="M7 7.5h.01M7 16.5h.01M11 7.5h2M11 16.5h2" />
      </>
    ),
    disk: (
      <>
        <ellipse cx="12" cy="5.5" rx="8" ry="2.5" />
        <path d="M4 5.5v13c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-13" />
        <path d="M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5" />
      </>
    ),
    cam: (
      <>
        <rect x="2" y="7" width="13" height="9" rx="1.5" />
        <path d="m15 10 6-3v10l-6-3" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </>
    ),
    bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
    copy: (
      <>
        <rect x="9" y="9" width="11" height="11" rx="1.5" />
        <path d="M5 15H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 3h9A1.5 1.5 0 0 1 14.5 4.5V5" />
      </>
    ),
    check: <path d="m4 12.5 5.5 5.5L20 6.5" />,
    play: <path d="M7 4.5v15l12-7.5-12-7.5Z" />,
    pause: <path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" />,
    net: (
      <>
        <circle cx="5" cy="12" r="2.2" /><circle cx="19" cy="5.5" r="2.2" /><circle cx="19" cy="18.5" r="2.2" />
        <path d="m7 11 10-4.5M7 13l10 4.5" />
      </>
    ),
    cpu: (
      <>
        <rect x="6" y="6" width="12" height="12" rx="1.5" />
        <rect x="10" y="10" width="4" height="4" />
        <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
      </>
    ),
    layers: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12.5 9 5 9-5M3 17l9 5 9-5" opacity=".55" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" />
        <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
      </>
    ),
    plus: <path d="M12 4.5v15M4.5 12h15" />,
    trash: (
      <>
        <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />
        <path d="M10 11v5.5M14 11v5.5" />
      </>
    ),
    temp: (
      <>
        <path d="M10 4a2 2 0 0 1 4 0v9.2a4.2 4.2 0 1 1-4 0V4Z" />
        <path d="M12 9v6" />
      </>
    ),
    venus: (
      <>
        <circle cx="12" cy="10" r="6.2" />
        <ellipse cx="12" cy="10" rx="10" ry="3.2" transform="rotate(-18 12 10)" />
      </>
    ),
    folder: <path d="M3 6.5h6l2 2.5h10v10.5H3V6.5Z" />,
    user: (
      <>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6" />
      </>
    ),
    lock: (
      <>
        <rect x="5.5" y="10.5" width="13" height="9.5" rx="1.5" />
        <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {paths[name]}
    </svg>
  );
}
