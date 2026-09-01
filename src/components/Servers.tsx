import { useEffect, useMemo, useState } from "react";
import { SERVERS, SERVER_OS, TOTAL_CAMS, fmt, type Cam, type VServer } from "../data";
import { Bar, Chip, Icon, Reveal, SectionHead } from "../ui";

type Filter = "all" | "online" | "offline" | "maint" | "risk";

interface LiveState {
  cpu: number;
  ram: number;
  net: number;
  disks: { temp: number; load: number; smart: "OK" | "PRE-FAIL" }[];
}

function tempColor(t: number): string {
  return t < 40 ? "#3ddc97" : t < 47 ? "#ffb224" : "#ff5d5d";
}

function buildLive(s: VServer): LiveState {
  return {
    cpu: 26 + s.camCount * 0.16 + Math.random() * 3,
    ram: 7.6 + s.camCount * 0.02,
    net: s.netMbps,
    disks: Array.from({ length: 12 }, (_, i) => {
      const warn = s.hddWarn > 0 && i === s.id % 12;
      return {
        temp: warn ? 48 + ((s.id * 3 + i) % 5) : 34 + ((s.id * 5 + i * 7) % 10) + Math.random(),
        load: 22 + ((s.id * 11 + i * 13) % 60),
        smart: warn ? "PRE-FAIL" : "OK",
      };
    }),
  };
}

function GlancesPanel({ server, extraCams }: { server: VServer; extraCams: number }) {
  const [live, setLive] = useState<LiveState>(() => buildLive(server));

  useEffect(() => {
    setLive(buildLive(server));
    const t = setInterval(() => {
      setLive((prev) => ({
        cpu: Math.max(8, Math.min(96, prev.cpu + (Math.random() - 0.5) * 6)),
        ram: prev.ram,
        net: Math.max(50, Math.min(930, prev.net + (Math.random() - 0.5) * 26)),
        disks: prev.disks.map((d) => ({
          ...d,
          temp: Math.max(30, Math.min(56, d.temp + (Math.random() - 0.5) * 1.2)),
          load: Math.max(5, Math.min(150, d.load + (Math.random() - 0.5) * 10)),
        })),
      }));
    }, 2000);
    return () => clearInterval(t);
  }, [server]);

  const avgTemp = live.disks.reduce((a, d) => a + d.temp, 0) / live.disks.length;

  return (
    <div className="border border-cyan/40 bg-panel/90">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <Icon name="server" className="h-4 w-4 text-cyan" />
        <div>
          <div className="font-disp text-base tracking-wide text-ink">{server.name}</div>
          <div className="font-mono text-[10px] text-dim">
            {server.ip} · {SERVER_OS} · uptime {server.uptimeDays} сут
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <Chip tone={server.status === "online" ? "ok" : server.status === "offline" ? "bad" : "warn"} dot>
            {server.status === "online" ? "online" : server.status === "offline" ? "offline" : "обслуживание"}
          </Chip>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px border-b border-line bg-line/60 font-mono text-center">
        {[
          ["CPU", `${Math.round(live.cpu)}%`, live.cpu > 70 ? "#ffb224" : "#3ddc97"],
          ["RAM", `${fmt(live.ram)} / 32 ГБ`, "#3ddcf0"],
          ["СЕТЬ", `${fmt(live.net)} Мбит/с`, live.net > 800 ? "#ffb224" : "#3ddcf0"],
        ].map(([k, v, c]) => (
          <div key={k as string} className="bg-panel px-2 py-2.5">
            <div className="text-[9px] uppercase tracking-[0.2em] text-dim">{k}</div>
            <div className="mt-0.5 text-[15px] font-bold transition-colors duration-500" style={{ color: c as string }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="temp" className="h-4 w-4 text-amber" />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-mut">
            glances · hddtemp — массив 12 дисков
          </span>
          <span className="ml-auto font-mono text-[11px]" style={{ color: tempColor(avgTemp) }}>
            t° ср. {fmt(avgTemp)}°C
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {live.disks.map((d, i) => (
            <div
              key={i}
              className="group border border-line bg-bg0 px-1.5 py-2 text-center transition-all hover:-translate-y-0.5 hover:border-cyan/50"
              title={`sda${String.fromCharCode(97 + i)} · ${fmt(d.load)} МБ/с · SMART ${d.smart}`}
            >
              <div className="font-mono text-[9px] text-dim">sd{String.fromCharCode(97 + i)}</div>
              <div className="font-mono text-[15px] font-bold transition-colors duration-500" style={{ color: tempColor(d.temp) }}>
                {Math.round(d.temp)}°
              </div>
              <div className={`mx-auto mt-1 h-1 w-6 ${d.smart === "OK" ? "bg-green/70" : "bg-red blink"}`} />
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-px bg-line/60 font-mono text-[11px]">
          {[
            ["Камер на узле", `${server.camCount + extraCams}`],
            ["Сеть (архив+просмотр)", `${server.netMbps} Мбит/с`],
            ["СХД", "RAID-6 · 70–100 ТБ"],
            ["Архив заполнен", `${server.archiveFill}%`],
            ["SMART предупреждений", String(server.hddWarn)],
            ["Сегмент записи", "600 c · MP4"],
          ].map(([k, v]) => (
            <div key={k} className="bg-panel px-3 py-2">
              <div className="text-[9px] uppercase tracking-widest text-dim">{k}</div>
              <div className="text-ink/90">{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 border border-line bg-bg0">
          <div className="flex items-center justify-between border-b border-line/70 px-3 py-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">мониторинг · команда</span>
            <span className="font-mono text-[9px] text-green">обновление 2 c</span>
          </div>
          <pre className="overflow-x-auto p-3 font-mono text-[11px] text-cyan/90">
{`glances -t 2 --export influxdb --export-influxdb-uri http://10.20.0.5:8086
smartctl -a /dev/sda | grep -E "Temperature|Reallocated"`}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function Servers({ customCams }: { customCams: Cam[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState(1);

  const extraByServer = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of customCams) m.set(c.serverId, (m.get(c.serverId) ?? 0) + 1);
    return m;
  }, [customCams]);

  const filtered = SERVERS.filter((s) => {
    if (filter === "all") return true;
    if (filter === "risk") return s.hddWarn > 0;
    return s.status === filter;
  });

  const selected = SERVERS.find((s) => s.id === selectedId) ?? SERVERS[0];
  const clusterNet = SERVERS.reduce((a, s) => a + s.netMbps, 0);
  const warns = SERVERS.reduce((a, s) => a + s.hddWarn, 0);

  const FILTERS: [Filter, string][] = [
    ["all", `Все · ${SERVERS.length}`],
    ["online", "Online"],
    ["offline", "Сбой"],
    ["maint", "Сервис"],
    ["risk", `HDD-риск · ${warns}`],
  ];

  return (
    <section id="servers" className="relative scroll-mt-20 border-y border-line/70 bg-bg1/50">
      <div className="mx-auto max-w-[1500px] px-4 py-20 md:px-8">
        <SectionHead
          index="02"
          kicker="реестр узлов"
          title="70 серверов записи"
          note="Каждый узел — автономный Венера-Сервер: сам пишет архив в локальный RAID-6 (70–100 ТБ), сам отдаёт субпотоки. Состояние дисков опрашивает glances + smartctl."
        />

        {/* сводка кластера */}
        <Reveal>
          <div className="mb-6 grid grid-cols-2 gap-px bg-line/60 font-mono md:grid-cols-4">
            {[
              ["Камер в кластере", (TOTAL_CAMS + customCams.length).toLocaleString("ru-RU"), "#ffb224"],
              ["Суммарный трафик", `${fmt(clusterNet / 1000, 1)} Гбит/с`, "#3ddcf0"],
              ["Суммарная СХД", `≈ ${fmt((SERVERS.length * 85) / 1000 * 1000, 0)} ТБ`, "#3ddc97"],
              ["HDD-предупреждений", String(warns), warns > 0 ? "#ffb224" : "#3ddc97"],
            ].map(([k, v, c]) => (
              <div key={k as string} className="bg-panel px-4 py-3.5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-dim">{k}</div>
                <div className="mt-1 text-xl font-bold" style={{ color: c as string }}>{v}</div>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          {/* сетка узлов */}
          <Reveal>
            <div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {FILTERS.map(([f, label]) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`border px-3 py-1.5 font-mono text-[11px] transition-all active:scale-95 ${
                      filter === f
                        ? "border-cyan bg-cyan text-bg0"
                        : "border-line text-mut hover:border-cyan/50 hover:text-cyan"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid max-h-[640px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 2xl:grid-cols-4">
                {filtered.map((s) => {
                  const extra = extraByServer.get(s.id) ?? 0;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={`group border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                        selectedId === s.id
                          ? "border-cyan bg-cyan/5 shadow-[0_0_20px_rgba(61,220,240,0.12)]"
                          : "border-line bg-panel/70 hover:border-cyan/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            s.status === "online" ? "bg-green" : s.status === "offline" ? "bg-red blink" : "bg-amber"
                          }`}
                        />
                        <span className="font-disp text-[13px] tracking-wide text-ink group-hover:text-cyan">
                          С-{String(s.id).padStart(2, "0")}
                        </span>
                        {s.hddWarn > 0 && (
                          <span className="ml-auto border border-amber/50 bg-amber/10 px-1 font-mono text-[9px] text-amber">
                            HDD!
                          </span>
                        )}
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-dim">{s.ip}</div>
                      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-mut">
                        <span>{s.camCount + extra} cam</span>
                        <span style={{ color: tempColor(s.hddTemp) }}>{s.hddTemp}°C</span>
                      </div>
                      <div className="mt-1.5">
                        <Bar value={s.archiveFill} max={100} color={s.archiveFill > 85 ? "#ff5d5d" : "#ffb224"} />
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="col-span-full grid place-items-center border border-dashed border-line py-16 font-mono text-xs text-dim">
                    по фильтру узлов не найдено
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          {/* glances-панель */}
          <Reveal delay={120}>
            <GlancesPanel server={selected} extraCams={extraByServer.get(selected.id) ?? 0} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
