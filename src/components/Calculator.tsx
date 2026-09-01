import type { CSSProperties, ReactNode } from "react";
import {
  DEFAULT_CALC, GPU_CAPS, PRESETS, compute, fmt, type CalcState, type GpuId,
} from "../data";
import { Bar, Chip, Icon, Reveal, SectionHead } from "../ui";

function Slider({
  label, unit, value, min, max, step, color, onChange, hint,
}: {
  label: string; unit: string; value: number; min: number; max: number; step: number;
  color: string; hint?: string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="border border-line bg-panel/70 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-mut">{label}</span>
        <span className="font-mono text-lg font-bold text-ink">
          {fmt(value, 1)} <span className="text-[11px] font-normal text-dim">{unit}</span>
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ "--pct": `${pct}%`, "--fill": color } as CSSProperties}
        aria-label={label}
      />
      {hint && <div className="mt-2 font-mono text-[10px] text-dim">{hint}</div>}
    </div>
  );
}

function Metric({
  label, value, unit, sub, bar, accent = "#ffb224",
}: {
  label: string; value: string; unit: string; sub?: string; bar?: ReactNode; accent?: string;
}) {
  return (
    <div className="group relative overflow-hidden border border-line bg-panel/70 p-4 transition-colors hover:border-cyan/40">
      <span className="absolute right-0 top-0 h-0 w-0 border-l-[22px] border-t-[22px] border-l-transparent border-t-line/70 transition-colors group-hover:border-t-cyan/40" />
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">{label}</div>
      <div className="mt-2 font-mono text-3xl font-bold leading-none" style={{ color: accent }}>
        {value}
        <span className="ml-1.5 text-xs font-normal text-mut">{unit}</span>
      </div>
      {sub && <div className="mt-2 font-mono text-[10.5px] leading-relaxed text-dim">{sub}</div>}
      {bar && <div className="mt-3">{bar}</div>}
    </div>
  );
}

type Verdict = "ok" | "warn" | "bad";
const verdict = (pct: number): Verdict => (pct < 70 ? "ok" : pct < 95 ? "warn" : "bad");

export default function Calculator({
  calc, setCalc,
}: {
  calc: CalcState; setCalc: (c: CalcState) => void;
}) {
  const r = compute(calc);

  const rows: { name: string; pct: number; detail: string }[] = [
    { name: "Сеть сервера (1G-линк)", pct: (r.netPerServer / 940) * 100, detail: `${fmt(r.netPerServer)} из 940 Мбит/с полезных` },
    { name: "NVDEC клиента", pct: r.nvdecPct, detail: `${fmt(r.clientNetMbps)} Мбит/с из ${r.gpuCapMbps} (${GPU_CAPS[calc.gpu].label})` },
    { name: "CPU клиента (композитинг)", pct: r.clientCpuPct, detail: `${calc.windows} окон × 0.45% + ОС` },
    { name: "CPU сервера (на узел)", pct: (r.serverCores / 12) * 100, detail: `${fmt(r.serverCores)} / 12 ядер i7-12700K` },
    { name: "СХД узла (архив)", pct: r.fitPct, detail: `${fmt(r.archivePerServerTB)} из ${calc.storageTB} ТБ` },
    { name: "RAM клиента", pct: (r.ramClientGB / 16) * 100, detail: `${fmt(r.ramClientGB)} / 16 ГБ` },
  ];
  const bottleneck = rows.reduce((a, b) => (b.pct > a.pct ? b : a));

  return (
    <section id="calc" className="relative scroll-mt-20">
      <div className="mx-auto max-w-[1500px] px-4 py-20 md:px-8">
        <SectionHead
          index="05"
          kicker="проверка железа"
          title="Потянет ли железо?"
          note="Пороги: зелёный < 70%, жёлтый 70–95%, красный ≥ 95%. Сеть сервера сверяется с целевыми ~400 Мбит/с из ТЗ."
        />

        <Reveal>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-dim">сценарии:</span>
            {PRESETS.map((p) => {
              const active = calc.servers === p.state.servers && calc.camsPerServer === p.state.camsPerServer && calc.mainMbps === p.state.mainMbps && calc.motion === p.state.motion;
              return (
                <button
                  key={p.name}
                  onClick={() => setCalc({ ...p.state })}
                  className={`border px-3 py-1.5 font-mono text-[11px] transition-all active:scale-95 ${
                    active ? "border-amber bg-amber text-bg0" : "border-line text-mut hover:border-amber/60 hover:text-amber"
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <Reveal>
            <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Slider label="Серверов записи" unit="шт" value={calc.servers} min={1} max={70} step={1} color="#ffb224"
                onChange={(v) => setCalc({ ...calc, servers: v })} hint="масштаб кластера — до 70 узлов" />
              <Slider label="Камер на сервер" unit="шт" value={calc.camsPerServer} min={40} max={140} step={5} color="#ffb224"
                onChange={(v) => setCalc({ ...calc, camsPerServer: v })} hint={`${fmt(calc.servers * calc.camsPerServer, 0)} камер в кластере суммарно`} />
              <Slider label="Основной поток (ср.)" unit="Мбит/с" value={calc.mainMbps} min={1} max={4} step={0.1} color="#ffb224"
                onChange={(v) => setCalc({ ...calc, mainMbps: v })} hint="1000–4000 кбит/с, максимум — у немногих камер" />
              <Slider label="Субпоток" unit="Мбит/с" value={calc.subMbps} min={0.5} max={1} step={0.05} color="#3ddcf0"
                onChange={(v) => setCalc({ ...calc, subMbps: v })} hint="500–1000 кбит/с · D1 · на клиента" />
              <Slider label="СХД на сервер" unit="ТБ" value={calc.storageTB} min={70} max={100} step={1} color="#3ddc97"
                onChange={(v) => setCalc({ ...calc, storageTB: v })} hint="RAID-6: 8×14 или 12×10 ТБ" />
              <Slider label="Глубина архива" unit="сут" value={calc.retention} min={7} max={60} step={1} color="#3ddc97"
                onChange={(v) => setCalc({ ...calc, retention: v })} />
              <Slider label="Motion-запись" unit="% времени" value={calc.motion} min={10} max={100} step={5} color="#3ddcf0"
                onChange={(v) => setCalc({ ...calc, motion: v })} hint="100% — непрерывная; 60–80% экономит СХД" />
              <Slider label="Окон на клиенте" unit="шт" value={calc.windows} min={4} max={100} step={4} color="#3ddcf0"
                onChange={(v) => setCalc({ ...calc, windows: v })} hint="максимум 100 · раскладка 10×10" />

              {/* выбор GPU */}
              <div className="border border-line bg-panel/70 p-4 sm:col-span-2 lg:col-span-1">
                <div className="mb-3 font-mono text-[11px] uppercase tracking-wider text-mut">Декодер клиента</div>
                <div className="grid gap-2">
                  {(Object.keys(GPU_CAPS) as GpuId[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setCalc({ ...calc, gpu: g })}
                      className={`flex items-center justify-between border px-3 py-2 text-left transition-all active:scale-[0.98] ${
                        calc.gpu === g ? "border-cyan bg-cyan/10" : "border-line hover:border-cyan/50"
                      }`}
                    >
                      <span>
                        <span className={`block font-mono text-[12px] font-bold ${calc.gpu === g ? "text-cyan" : "text-ink"}`}>
                          {GPU_CAPS[g].label}
                        </span>
                        <span className="block font-mono text-[9.5px] text-dim">{GPU_CAPS[g].note}</span>
                      </span>
                      <span className="font-mono text-[11px] text-mut">{GPU_CAPS[g].mbps} Мбит/с</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal delay={100}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Metric
                  label="Сеть на сервер"
                  value={fmt(r.netPerServer)}
                  unit="Мбит/с"
                  accent={r.netPerServer > 800 ? "#ff5d5d" : "#ffb224"}
                  sub={`${calc.camsPerServer} × (${fmt(calc.mainMbps, 1)} + ${fmt(calc.subMbps, 2)}) Мбит/с · цель ТЗ ≈ 400`}
                  bar={<Bar value={(r.netPerServer / 400) * 100} max={100} label="от целевых 400 Мбит/с" color="#ffb224" />}
                />
                <Metric
                  label="Архив на сервер"
                  value={fmt(r.archivePerServerTB)}
                  unit="ТБ"
                  accent={r.fitPct > 100 ? "#ff5d5d" : "#ffb224"}
                  sub={`${calc.camsPerServer} кам × ${fmt(calc.mainMbps, 1)} Мбит/с × ${calc.retention} сут × ${calc.motion}%`}
                  bar={<Bar value={r.fitPct} max={100} label={`влезает в ${calc.storageTB} ТБ`} color={r.fitPct > 100 ? "#ff5d5d" : "#3ddc97"} />}
                />
                <Metric
                  label="Массив узла"
                  value={r.disksLabel.split(" ")[0]}
                  unit={r.disksLabel.split(" ").slice(1).join(" ")}
                  accent="#3ddc97"
                  sub={`кластер: ${calc.servers} узлов × ${calc.storageTB} ТБ = ${fmt(r.clusterStorageTB / 1000, 1)} ПБ суммарно`}
                />
                <Metric
                  label="Клиент ← субпотоки"
                  value={fmt(r.clientNetMbps)}
                  unit="Мбит/с"
                  accent="#3ddcf0"
                  sub={`${calc.windows} окон × ${fmt(calc.subMbps, 2)} Мбит/с · обычный 1G-линк клиента`}
                  bar={<Bar value={r.nvdecPct} max={100} label={`NVDEC ${GPU_CAPS[calc.gpu].label}`} color="#3ddcf0" />}
                />
                <Metric
                  label="CPU сервера / узел"
                  value={fmt(r.serverCores)}
                  unit="из 12 ядер"
                  accent={verdict((r.serverCores / 12) * 100) === "ok" ? "#3ddc97" : "#ffb224"}
                  sub="ffmpeg -c copy: ~2% ядра на поток + I/O"
                  bar={<Bar value={(r.serverCores / 12) * 100} max={100} label="i7-12700K (8P+4E)" color="#3ddc97" />}
                />
                <Metric
                  label="CPU клиента"
                  value={fmt(r.clientCpuPct, 0)}
                  unit="% i5-12400"
                  accent={verdict(r.clientCpuPct) === "ok" ? "#3ddc97" : "#ffb224"}
                  sub="композитинг 100 окон, декодирование — на GPU"
                  bar={<Bar value={r.clientCpuPct} max={100} label="i5-12400 · 6 ядер" color={verdict(r.clientCpuPct) === "ok" ? "#3ddc97" : "#ffb224"} />}
                />
              </div>
            </Reveal>

            <Reveal delay={180}>
              <div className="mt-4 border border-line bg-panel/80 p-5">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Icon name="cpu" className="h-4 w-4 text-amber" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-mut">Вердикт по подсистемам</span>
                  <span className="ml-auto font-mono text-[10px] text-dim">весь кластер: {fmt(r.totalCams, 0)} камер · {fmt(r.clusterNetGbps, 1)} Гбит/с · {fmt(r.clusterArchiveTB / 1000, 1)} ПБ архива</span>
                </div>
                <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
                  {rows.map((row) => {
                    const v = verdict(row.pct);
                    return (
                      <div key={row.name}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-[12px] text-mut">{row.name}</span>
                          <Chip tone={v}>{v === "ok" ? "запас" : v === "warn" ? "впритык" : "перегруз"}</Chip>
                        </div>
                        <Bar value={row.pct} max={100} color={v === "ok" ? "#3ddc97" : v === "warn" ? "#ffb224" : "#ff5d5d"} />
                        <div className="mt-1 font-mono text-[10px] text-dim">{row.detail}</div>
                      </div>
                    );
                  })}
                </div>
                <div className={`mt-5 border-l-2 py-1 pl-4 text-[13px] leading-relaxed ${
                  verdict(bottleneck.pct) === "ok" ? "border-green text-mut" : verdict(bottleneck.pct) === "warn" ? "border-amber text-mut" : "border-red text-ink"
                }`}>
                  <b className={verdict(bottleneck.pct) === "ok" ? "text-green" : verdict(bottleneck.pct) === "warn" ? "text-amber" : "text-red"}>
                    Узкое место — «{bottleneck.name}» ({Math.round(bottleneck.pct)}%).
                  </b>{" "}
                  {bottleneck.name.startsWith("Сеть")
                    ? "Сервер упирается в гигабит: разнесите VLAN камер и аплинка, включите 2.5G/10G между сервером и ядром, либо режьте средний битрейт до H.265 1.5 Мбит/с."
                    : bottleneck.name === "СХД узла (архив)"
                      ? "Архив не помещается в 70–100 ТБ: включите motion-запись (60–80%) или снизьте битрейт/глубину — потребность падает кратно."
                      : bottleneck.name === "NVDEC клиента"
                        ? "Декодеру тяжело: поднимите GTX 1660 вместо 1060, либо сократите стену до 64 окон, либо субпоток до 500 кбит/с."
                        : bottleneck.name === "CPU клиента (композитинг)"
                          ? "Композитинг 100 окон съедает i5: рисуйте раскладку через WebGL-текстуры или разбейте на два монитора по 50 окон."
                          : "Конфигурация из ТЗ проходит с запасом — можно брать в работу."}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
