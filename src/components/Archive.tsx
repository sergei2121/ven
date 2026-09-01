import { useEffect, useMemo, useState } from "react";
import { compute, fmt, type CalcState } from "../data";
import { Bar, Icon, Reveal, SectionHead } from "../ui";

const DAYS = ["Сегодня", "−1 сут", "−2 сут", "−3 сут", "−7 сут", "−14 сут"];

function seededMarkers(day: number): { pos: number; kind: "motion" | "alarm" | "gap" }[] {
  const out: { pos: number; kind: "motion" | "alarm" | "gap" }[] = [];
  for (let i = 0; i < 9; i++) {
    const pos = ((day * 97 + i * 173 + 41) % 1400) + 10;
    const kind = i % 5 === 2 ? "alarm" : i % 7 === 3 ? "gap" : "motion";
    out.push({ pos, kind });
  }
  return out.sort((a, b) => a.pos - b.pos);
}

function fmtMin(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(Math.floor(min % 60)).padStart(2, "0");
  return `${h}:${m}`;
}

function tempColor(t: number): string {
  return t < 40 ? "#3ddc97" : t < 47 ? "#ffb224" : "#ff5d5d";
}

export default function Archive({ calc }: { calc: CalcState }) {
  const r = compute(calc);
  const [day, setDay] = useState(0);
  const [pos, setPos] = useState(512);
  const [playing, setPlaying] = useState(false);
  const markers = useMemo(() => seededMarkers(day), [day]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setPos((p) => (p >= 1439 ? 0 : p + 3)), 60);
    return () => clearInterval(t);
  }, [playing]);

  const fillPct = Math.min(100, r.fitPct);
  const over = r.fitPct > 100;
  const shownDisks = Math.min(14, calc.storageTB >= 90 ? 12 : 10);
  const headroom = calc.storageTB - r.archivePerServerTB;

  const [temps, setTemps] = useState<number[]>(() =>
    Array.from({ length: 12 }, (_, i) => 34 + ((i * 7) % 10))
  );
  useEffect(() => {
    const t = setInterval(
      () => setTemps((prev) => prev.map((v) => Math.max(31, Math.min(52, v + (Math.random() - 0.5) * 1.4)))),
      2400
    );
    return () => clearInterval(t);
  }, []);

  return (
    <section id="archive" className="relative scroll-mt-20 border-t border-line/70 bg-bg1/50">
      <div className="mx-auto max-w-[1500px] px-4 py-20 md:px-8">
        <SectionHead
          index="06"
          kicker="хранение"
          title="Архив на каждом узле"
          note={`Каждый из 70 серверов держит собственный RAID-6 на ${calc.storageTB} ТБ — без центрального хранилища. Состояние дисков опрашивают glances + smartctl. Расчёт синхронизирован с калькулятором: архив ${fmt(r.archivePerServerTB)} ТБ на узел.`}
        />

        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* массив + SMART */}
          <Reveal>
            <div className="flex h-full flex-col border border-line bg-panel/70 p-5">
              <div className="mb-1 flex items-center gap-2">
                <Icon name="disk" className="h-4 w-4 text-amber" />
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-mut">
                  Венера-С-07 · массив {calc.storageTB} ТБ
                </span>
              </div>
              <div className="font-mono text-[10px] text-dim">
                RAID-6 · {shownDisks} дисков × 12 ТБ · сегменты 600 c
              </div>

              <div className="mt-5 flex h-40 items-end gap-1.5">
                {Array.from({ length: shownDisks }).map((_, i) => {
                  const isParity = i >= shownDisks - 2;
                  return (
                    <div key={i} className="group relative flex-1 border border-line bg-bg0" title={isParity ? "диск чётности" : `диск данных ${i + 1}`}>
                      {isParity ? (
                        <div
                          className="absolute inset-0"
                          style={{ background: "repeating-linear-gradient(45deg, #12454e 0 6px, #0f1520 6px 12px)", opacity: 0.9 }}
                        />
                      ) : (
                        <div
                          className={`absolute inset-x-0 bottom-0 transition-all duration-700 ${over ? "bg-red/80" : "disk-fill"}`}
                          style={{ height: `${fillPct}%`, opacity: 0.85 }}
                        />
                      )}
                      <span className="absolute inset-x-0 top-1 text-center font-mono text-[8px] text-dim group-hover:text-cyan">
                        {isParity ? `P${i - (shownDisks - 3)}` : String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className="absolute inset-x-0 bottom-1 mx-auto h-1 w-1 rounded-full"
                        style={{ background: tempColor(temps[i]), boxShadow: `0 0 6px ${tempColor(temps[i])}` }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 space-y-3">
                <Bar
                  value={r.archivePerServerTB}
                  max={calc.storageTB}
                  label={`архив ${fmt(r.archivePerServerTB)} / ${calc.storageTB} ТБ`}
                  color={over ? "#ff5d5d" : "#ffb224"}
                />
                <div className="grid grid-cols-3 gap-px bg-line/60 text-center font-mono">
                  {[
                    ["сырьё", `${fmt(shownDisks * 12)} ТБ`],
                    ["полезно", `${fmt((shownDisks - 2) * 10)} ТБ`],
                    ["запас", headroom >= 0 ? `${fmt(headroom)} ТБ` : `−${fmt(-headroom)} ТБ`],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-panel px-1 py-2">
                      <div className="text-[9px] uppercase tracking-widest text-dim">{k}</div>
                      <div className={`text-[13px] font-bold ${headroom < 0 && k === "запас" ? "text-red" : "text-ink"}`}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* S.M.A.R.T. */}
                <div className="border border-line bg-bg0">
                  <div className="flex items-center justify-between border-b border-line/70 px-3 py-1.5">
                    <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-dim">
                      <Icon name="temp" className="h-3 w-3 text-amber" /> glances · hddtemp · smart
                    </span>
                    <span className="font-mono text-[9px] text-green">опрос 2 c</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1 p-2">
                    {temps.map((t, i) => (
                      <div key={i} className="border border-line/60 bg-panel px-1 py-1 text-center transition-colors hover:border-cyan/40"
                        title={`sd${String.fromCharCode(97 + i)} · ${Math.round(t)}°C · Reallocated: ${i === 4 ? 14 : 0}`}>
                        <div className="font-mono text-[8px] text-dim">sd{String.fromCharCode(97 + i)}</div>
                        <div className="font-mono text-[11px] font-bold transition-colors duration-500" style={{ color: tempColor(t) }}>
                          {Math.round(t)}°
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 border-t border-line/60 px-3 py-1.5 font-mono text-[9.5px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber pulse-dot" />
                    <span className="text-amber">sde · Reallocated_Sector_Ct = 14 → PRE-FAIL, заявка в дежурную смену</span>
                  </div>
                </div>

                <p className="border-l-2 border-amber/60 pl-3 text-[12px] leading-relaxed text-mut">
                  {over ? (
                    <>
                      <b className="text-red">Архив не влезает в {calc.storageTB} ТБ.</b> В калькуляторе: motion 60–75%,
                      H.265 1.5–2 Мбит/с или глубина 14 сут — потребность падает кратно.
                    </>
                  ) : (
                    <>
                      Ротация по возрасту: глубина {calc.retention} сут выдерживается автоматически, сегменты удаляются
                      без дефрагментации. При PRE-FAIL — замена hot-spare из корзины.
                    </>
                  )}
                </p>
              </div>
            </div>
          </Reveal>

          {/* плеер архива */}
          <Reveal delay={120}>
            <div className="flex h-full flex-col border border-line bg-panel/70 p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Icon name="rec" className="h-4 w-4 text-red" />
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-mut">
                  Плеер архива · С-07 · CAM-042 «Склад Б»
                </span>
                <div className="ml-auto flex gap-1">
                  {DAYS.map((d, i) => (
                    <button
                      key={d}
                      onClick={() => { setDay(i); setPos(512); setPlaying(false); }}
                      className={`px-2 py-1 font-mono text-[10px] transition-all active:scale-95 ${
                        day === i ? "bg-cyan text-bg0" : "bg-line/60 text-mut hover:text-ink"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative mb-4 aspect-video overflow-hidden border border-line bg-bg0">
                <div className="tile-video absolute inset-0" style={{ filter: "hue-rotate(140deg) saturate(0.6)", animationDuration: "18s" }} />
                <div className="scanlines absolute inset-0" />
                <div className="noise-layer absolute inset-0" style={{ opacity: 0.1 }} />
                <div className="absolute left-2 top-2 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${playing ? "bg-green pulse-dot" : "bg-amber"}`} />
                  <span className="font-mono text-[10px] font-bold tracking-widest text-ink">
                    {playing ? "ВОСПРОИЗВЕДЕНИЕ" : "ПАУЗА"}
                  </span>
                </div>
                <div className="absolute right-2 top-2 font-mono text-[10px] text-cyan">MAIN 1080p · читается с узла С-07</div>
                <div className="absolute bottom-2 left-2 font-mono text-2xl font-bold tracking-widest text-ink drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  {fmtMin(pos)}<span className="text-dim">:{String(Math.floor((pos * 60) % 60)).padStart(2, "0")}</span>
                </div>
                <div className="absolute bottom-2 right-2 font-mono text-[10px] text-mut">{DAYS[day]}</div>
              </div>

              <div className="relative h-16 select-none border border-line bg-bg0">
                <div className="absolute inset-x-2 top-3 h-4 bg-line/50">
                  <div className="absolute inset-y-0 left-0 w-[31%] bg-amber/50" />
                  <div className="absolute inset-y-0 left-[33%] w-[22%] bg-amber/50" />
                  <div className="absolute inset-y-0 left-[58%] w-[42%] bg-amber/50" />
                  {markers.filter((m) => m.kind !== "gap").map((m, i) => (
                    <button
                      key={i}
                      onClick={() => { setPos(m.pos); setPlaying(false); }}
                      title={`${fmtMin(m.pos)} · ${m.kind === "alarm" ? "тревога" : "детекция"}`}
                      className={`absolute -top-1 h-6 w-1.5 transition-transform hover:scale-y-125 ${
                        m.kind === "alarm" ? "bg-red" : "bg-cyan"
                      }`}
                      style={{ left: `${(m.pos / 1440) * 100}%` }}
                    />
                  ))}
                </div>
                <input
                  type="range"
                  min={0}
                  max={1439}
                  value={pos}
                  onChange={(e) => { setPos(Number(e.target.value)); setPlaying(false); }}
                  className="absolute inset-x-2 top-9 w-[calc(100%-16px)]"
                  style={{ "--pct": `${(pos / 1439) * 100}%`, "--fill": "#3ddcf0" } as React.CSSProperties}
                  aria-label="Перемотка архива"
                />
                {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
                  <span key={h} className="absolute top-0.5 font-mono text-[8px] text-dim"
                    style={{ left: `calc(${(h / 24) * 100}% * 0.98 + 8px)` }}>
                    {String(h % 24).padStart(2, "0")}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className={`flex items-center gap-2 border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition-all active:scale-95 ${
                    playing
                      ? "border-amber bg-amber text-bg0"
                      : "border-cyan/60 bg-cyan/10 text-cyan hover:bg-cyan hover:text-bg0"
                  }`}
                >
                  <Icon name={playing ? "pause" : "play"} className="h-3.5 w-3.5" />
                  {playing ? "пауза" : "смотреть"}
                </button>
                {[1, 4, 16, 64].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaying(true)}
                    className="border border-line px-2.5 py-2 font-mono text-[11px] text-mut transition-colors hover:border-cyan/60 hover:text-cyan"
                  >
                    {s}×
                  </button>
                ))}
                <span className="ml-auto hidden items-center gap-4 font-mono text-[10px] text-dim sm:flex">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-cyan" /> детекция</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-red" /> тревога</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-4 bg-amber/50" /> запись</span>
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-px bg-line/60 font-mono text-[11px] sm:grid-cols-4">
                {[
                  ["сегмент", "600 c · MP4"],
                  ["выгрузка", "HTTP-range с узла"],
                  ["целостность", "SHA-256 на сегмент"],
                  ["глубина", `${calc.retention} сут · ротация`],
                ].map(([k, v]) => (
                  <div key={k} className="bg-panel px-3 py-2">
                    <div className="text-[9px] uppercase tracking-widest text-dim">{k}</div>
                    <div className="text-ink/90">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
