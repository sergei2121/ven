import { useEffect, useMemo, useRef, useState } from "react";
import {
  CAMS, SERVERS, eventText, type Cam, type EventType, type Template,
} from "../data";
import { hhmmss, Chip, Icon, Reveal, useNow } from "../ui";

const EVENT_KINDS: EventType[] = ["motion", "motion", "motion", "archive", "archive", "ptz", "auth", "offline"];

interface WallEvent {
  t: string;
  cam: string;
  text: string;
  type: EventType;
}

function Radar({ cams }: { cams: Cam[] }) {
  const [blips, setBlips] = useState<{ id: number; x: number; y: number }[]>([]);
  useEffect(() => {
    const t = setInterval(() => {
      setBlips((prev) => [
        ...prev.slice(-11),
        { id: Date.now(), x: 14 + Math.random() * 72, y: 14 + Math.random() * 72 },
      ]);
    }, 1700);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-cyan/30 bg-bg0/70">
      <div className="radar-sweep absolute inset-0" />
      <div className="absolute inset-4 rounded-full border border-cyan/15" />
      <div className="absolute inset-9 rounded-full border border-cyan/10" />
      <div className="absolute left-1/2 top-0 h-full w-px bg-cyan/10" />
      <div className="absolute left-0 top-1/2 h-px w-full bg-cyan/10" />
      {blips.map((b) => (
        <span
          key={b.id}
          className="absolute h-1 w-1 rounded-full bg-cyan transition-opacity duration-1000"
          style={{ left: `${b.x}%`, top: `${b.y}%`, opacity: 0.9 }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-1 text-center font-mono text-[8px] uppercase tracking-widest text-cyan/70">
        {cams.length} подкл.
      </div>
    </div>
  );
}

function Tile({
  cam,
  now,
  alert,
  onOpen,
  active,
  detail,
}: {
  cam: Cam;
  now: Date;
  alert: boolean;
  onOpen: () => void;
  active: boolean;
  detail: boolean;
}) {
  const offline = cam.status === "offline";
  return (
    <button
      onClick={onOpen}
      className={`group relative aspect-video overflow-hidden border text-left transition-all duration-300 ${
        active ? "border-cyan shadow-[0_0_24px_rgba(61,220,240,0.25)]" : "border-line hover:border-cyan/60"
      } ${alert ? "tile-alert" : ""} hover:z-10 hover:scale-[1.03] hover:shadow-[0_8px_30px_rgba(0,0,0,0.55)]`}
    >
      {offline ? (
        <div className="absolute inset-0 bg-[#0c1017]">
          <div className="noise-layer tile-noise absolute inset-0" style={{ opacity: 0.22 }} />
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-mono text-[10px] tracking-[0.25em] text-red/80">НЕТ СИГНАЛА</span>
          </div>
        </div>
      ) : (
        <>
          <div className="tile-video absolute inset-0" style={{ filter: `hue-rotate(${cam.hue}deg) saturate(0.75)`, animationDelay: `${-cam.boxDelay}s` }} />
          <div className="scanlines absolute inset-0" />
          {detail && <div className="tile-noise noise-layer absolute inset-0" />}
          {detail && (
            <div
              className="det-box absolute left-[12%] top-[22%] h-[34%] w-[30%] border border-amber/90"
              style={{ animationDelay: `${-cam.boxDelay}s`, animationDuration: `${cam.boxDur}s` }}
            >
              <span className="absolute -top-4 left-0 bg-amber/90 px-1 font-mono text-[8px] font-bold text-bg0">
                motion {Math.round(62 + ((cam.id * 7) % 33))}%
              </span>
            </div>
          )}
          {detail && (
            <>
              <span className="absolute left-1 top-1 h-2 w-2 border-l border-t border-cyan/50" />
              <span className="absolute right-1 top-1 h-2 w-2 border-r border-t border-cyan/50" />
              <span className="absolute bottom-1 left-1 h-2 w-2 border-b border-l border-cyan/50" />
              <span className="absolute bottom-1 right-1 h-2 w-2 border-b border-r border-cyan/50" />
            </>
          )}
        </>
      )}

      <div className="absolute left-1.5 top-1.5 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-red blink" />
        <span className="font-mono text-[9px] font-bold tracking-widest text-ink/90">REC</span>
        <span className="border border-cyan/40 px-1 font-mono text-[8px] text-cyan/90">
          С-{String(cam.serverId).padStart(2, "0")}
        </span>
        {cam.ptz && detail && <span className="border border-cyan/50 px-1 font-mono text-[8px] text-cyan">PTZ</span>}
      </div>
      {detail && (
        <div className="absolute right-1.5 top-1.5 font-mono text-[9px] tracking-wider text-ink/80">
          {hhmmss(now)}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-bg0/95 via-bg0/55 to-transparent px-1.5 pb-1 pt-5">
        <span className="truncate font-mono text-[9.5px] leading-tight text-ink/95">
          <b className="text-amber">CAM-{cam.num}</b> · {cam.name}
        </span>
        {detail && (
          <span className="shrink-0 font-mono text-[8px] text-cyan/90">
            {offline ? "——" : `SUB ${cam.subKbps} кбит/с`}
          </span>
        )}
      </div>

      <div className="absolute inset-0 grid place-items-center bg-bg0/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="border border-cyan/70 bg-bg0/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
          развернуть ▸
        </span>
      </div>
    </button>
  );
}

function FocusPanel({
  cam,
  onLog,
  onClose,
}: {
  cam: Cam;
  onLog: (e: WallEvent) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"sub" | "main" | "arch">("sub");
  const [flash, setFlash] = useState(false);
  const [speed, setSpeed] = useState(1);
  const offline = cam.status === "offline";
  const server = SERVERS.find((s) => s.id === cam.serverId);

  const snapshot = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 260);
    onLog({ t: hhmmss(new Date()), cam: `CAM-${cam.num}`, text: "кадр сохранён → /snapshots", type: "auth" });
  };

  return (
    <aside className="flex h-fit flex-col border border-cyan/40 bg-panel/90 shadow-[0_0_40px_rgba(61,220,240,0.08)]">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="font-mono text-[11px] tracking-widest text-cyan">
          КАНАЛ <b className="text-ink">CAM-{cam.num}</b>
        </span>
        <button
          onClick={onClose}
          className="border border-line px-2 py-0.5 font-mono text-[11px] text-mut transition-colors hover:border-red/60 hover:text-red"
        >
          ✕
        </button>
      </div>

      <div className="relative aspect-video overflow-hidden">
        {offline ? (
          <div className="absolute inset-0 grid place-items-center bg-[#0c1017]">
            <div className="noise-layer absolute inset-0" style={{ opacity: 0.2 }} />
            <div className="text-center">
              <div className="font-mono text-xs tracking-[0.3em] text-red">НЕТ СИГНАЛА</div>
              <div className="mt-1 font-mono text-[10px] text-dim">RTSP reconnect… попытка 4/10</div>
            </div>
          </div>
        ) : (
          <>
            <div className="tile-video absolute inset-0" style={{ filter: `hue-rotate(${cam.hue}deg) saturate(0.85)`, animationDuration: "10s" }} />
            <div className="scanlines absolute inset-0" />
            <div className="tile-noise noise-layer absolute inset-0" />
            <div className="det-box absolute left-[16%] top-[24%] h-[36%] w-[32%] border-2 border-amber" style={{ animationDuration: "8s" }}>
              <span className="absolute -top-5 left-0 bg-amber px-1.5 font-mono text-[10px] font-bold text-bg0">object: person · 0.94</span>
            </div>
            {tab === "main" && (
              <div className="absolute inset-3 border border-dashed border-cyan/50">
                <span className="absolute right-0 top-0 bg-cyan/90 px-1.5 py-0.5 font-mono text-[9px] font-bold text-bg0">
                  MAIN 1920×1080 · {cam.mainMbps.toFixed(1)} Мбит/с
                </span>
              </div>
            )}
            {tab === "arch" && (
              <div className="absolute inset-x-0 bottom-0 bg-bg0/85 px-3 pb-2 pt-3">
                <div className="mb-1 flex justify-between font-mono text-[9px] text-mut">
                  <span>АРХИВ · 00:00</span><span className="text-amber">▶ скорость {speed}×</span><span>23:59</span>
                </div>
                <div className="relative h-2 bg-line">
                  <div className="absolute inset-y-0 left-[12%] w-px bg-cyan" />
                  <div className="absolute inset-y-0 left-[37%] w-1 bg-amber/80" />
                  <div className="absolute inset-y-0 left-[64%] w-2 bg-amber/80" />
                  <div className="absolute inset-y-0 left-[31%] w-1.5 bg-red/80" />
                  <div className="absolute -top-0.5 h-3 w-0.5 bg-ink" style={{ left: "41%" }} />
                </div>
                <div className="mt-1.5 flex gap-1">
                  {[1, 4, 16].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-1.5 font-mono text-[9px] ${speed === s ? "bg-amber text-bg0" : "bg-line text-mut"} transition-colors`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <div className="absolute left-2 top-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red blink" />
          <span className="font-mono text-[10px] font-bold tracking-widest text-ink">{offline ? "OFFLINE" : "LIVE"}</span>
        </div>
        <div className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-200 ${flash ? "opacity-70" : "opacity-0"}`} />
      </div>

      <div className="grid grid-cols-3 border-b border-line font-mono text-[10px] uppercase tracking-wider">
        {([["sub", "Субпоток"], ["main", "Основной"], ["arch", "Архив"]] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-2 py-2 transition-colors ${tab === k ? "bg-cyan/10 text-cyan" : "text-dim hover:text-mut"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-2 p-3">
        <div className="font-mono text-[11px] leading-relaxed text-mut">
          {tab === "sub" && <>SUB D1 · H.264 · <b className="text-cyan">{cam.subKbps} кбит/с</b> — единственный тракт на клиент, декодируется NVDEC.</>}
          {tab === "main" && <>MAIN 1080p · {cam.mainMbps.toFixed(1)} Мбит/с — пишется локально на «{server?.name}» методом <span className="text-amber">-c copy</span>, клиенту не отдаётся.</>}
          {tab === "arch" && <>Сегменты по 600 c · MP4 · индекс в PostgreSQL сервера, перемотка по событиям детекции.</>}
        </div>

        <div className="grid grid-cols-2 gap-px bg-line/60 text-[11px]">
          {[
            ["Сервер", `${server?.name ?? "—"} · ${server?.ip ?? ""}`],
            ["RTSP", `rtsp://${server?.ip ?? "10.20.0.10"}/s${tab === "sub" ? 2 : 1}:554`],
            ["OS сервера", "Ubuntu 24.04 LTS"],
            ["Архив", "70–100 ТБ RAID-6 · 30 сут"],
          ].map(([k, v]) => (
            <div key={k} className="bg-panel px-2 py-1.5">
              <div className="font-mono text-[9px] uppercase tracking-widest text-dim">{k}</div>
              <div className="truncate font-mono text-[11px] text-ink/90">{v}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={snapshot}
            disabled={offline}
            className="flex-1 border border-amber/60 bg-amber/10 px-2 py-1.5 font-mono text-[11px] uppercase tracking-wider text-amber transition-all hover:bg-amber hover:text-bg0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ⬒ Снимок
          </button>
          <button
            onClick={() => onLog({ t: hhmmss(new Date()), cam: `CAM-${cam.num}`, text: "PTZ: пресет «Обход» выполнен", type: "ptz" })}
            disabled={!cam.ptz || offline}
            className="flex-1 border border-cyan/60 bg-cyan/10 px-2 py-1.5 font-mono text-[11px] uppercase tracking-wider text-cyan transition-all hover:bg-cyan hover:text-bg0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ◎ PTZ
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function CameraWall({
  camById,
  templates,
  activeId,
  onActivate,
}: {
  camById: Map<number, Cam>;
  templates: Template[];
  activeId: string;
  onActivate: (id: string) => void;
}) {
  const now = useNow(1000);
  const [layout, setLayout] = useState<16 | 36 | 64 | 100>(36);
  const [page, setPage] = useState(0);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [focusVisible, setFocusVisible] = useState(true);
  const [events, setEvents] = useState<WallEvent[]>([]);
  const [alertId, setAlertId] = useState<number | null>(null);
  const alertTimer = useRef<number | null>(null);

  const active = templates.find((t) => t.id === activeId) ?? templates[0];
  const tplCams = useMemo(
    () => (active ? active.camIds.map((id) => camById.get(id)).filter((c): c is Cam => !!c) : []),
    [active, camById]
  );

  const pages = Math.max(1, Math.ceil(tplCams.length / layout));
  const cur = Math.min(page, pages - 1);
  const visible = tplCams.slice(cur * layout, cur * layout + layout);

  const pushEvent = (e: WallEvent) => setEvents((prev) => [e, ...prev].slice(0, 24));

  useEffect(() => {
    const tick = () => {
      const cam = CAMS[Math.floor(Math.random() * CAMS.length)];
      const type: EventType =
        cam.status === "offline" && Math.random() < 0.5
          ? "offline"
          : EVENT_KINDS[Math.floor(Math.random() * EVENT_KINDS.length)];
      pushEvent({ t: hhmmss(new Date()), cam: `С-${String(cam.serverId).padStart(2, "0")}·CAM-${cam.num}`, text: eventText(type), type });
      if (type === "motion") {
        setAlertId(cam.id);
        if (alertTimer.current) window.clearTimeout(alertTimer.current);
        alertTimer.current = window.setTimeout(() => setAlertId(null), 1600);
      }
    };
    tick();
    const t = setInterval(tick, 2600);
    return () => {
      clearInterval(t);
      if (alertTimer.current) window.clearTimeout(alertTimer.current);
    };
  }, []);

  useEffect(() => setPage(0), [layout, activeId]);

  const cols = layout === 16 ? 4 : layout === 36 ? 6 : layout === 8 * 8 ? 8 : 10;
  const detail = layout <= 36;
  const focused = focusedId != null ? camById.get(focusedId) : undefined;

  return (
    <section id="wall" className="relative scroll-mt-20">
      <div className="mx-auto max-w-[1500px] px-4 pb-6 pt-10 md:px-8">
        {/* шапка стены */}
        <div className="relative mb-8 overflow-hidden">
          <span className="ghost-word pointer-events-none absolute -top-12 right-0 hidden font-disp text-[10rem] leading-none lg:block">
            ВЕНЕРА
          </span>
          <Reveal>
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.25em] text-cyan">
              <span className="inline-block h-px w-10 bg-cyan/60" />
              01 // оперативный контур · до 100 окон одновременно
            </div>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
              <h1 className="font-disp text-4xl uppercase leading-[0.98] tracking-wide md:text-6xl">
                Стена на 100 окон
                <span className="text-amber">.</span>
                <span className="block text-cyan">70 серверов записи</span>
              </h1>
              <div className="flex flex-wrap gap-2">
                <Chip tone="ok" dot>{tplCams.length} в шаблоне</Chip>
                <Chip tone="info">субпоток 500–1000 кбит/с</Chip>
                <Chip tone="warn" dot>NVDEC GTX 1660</Chip>
                <Chip tone="idle">i5-12400 · композитинг</Chip>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mut">
              Клиент берёт с серверов только <b className="text-cyan">субпотоки D1</b> — их аппаратно декодирует
              GTX 1660 (NVDEC), i5-12400 занимается композитингом. Основные потоки 1080p в это время пишутся
              в архивы 70 серверов и стену не нагружают. Шаблон собирает камеры с разных серверов — до 100 штук.
            </p>
          </Reveal>
        </div>

        {/* пульт */}
        <Reveal>
          <div className="mb-4 flex flex-wrap items-center gap-3 border border-line bg-panel/70 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Icon name="grid" className="h-4 w-4 text-cyan" />
              {([16, 36, 64, 100] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setLayout(s)}
                  className={`px-2.5 py-1 font-mono text-[11px] transition-all active:scale-90 ${
                    layout === s ? "bg-cyan text-bg0" : "bg-line/60 text-mut hover:text-ink"
                  }`}
                >
                  {s === 16 ? "4×4" : s === 36 ? "6×6" : s === 64 ? "8×8" : "10×10"}
                </button>
              ))}
            </div>
            <div className="h-5 w-px bg-line" />
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(Math.max(0, cur - 1))}
                disabled={cur === 0}
                className="border border-line px-2 py-1 font-mono text-[11px] text-mut transition-colors hover:border-cyan/60 hover:text-cyan disabled:opacity-30"
              >
                ◂
              </button>
              <span className="min-w-[86px] text-center font-mono text-[11px] text-ink">
                стр. {cur + 1} / {pages}
              </span>
              <button
                onClick={() => setPage(Math.min(pages - 1, cur + 1))}
                disabled={cur >= pages - 1}
                className="border border-line px-2 py-1 font-mono text-[11px] text-mut transition-colors hover:border-cyan/60 hover:text-cyan disabled:opacity-30"
              >
                ▸
              </button>
            </div>
            <div className="h-5 w-px bg-line" />
            <label className="flex items-center gap-2 font-mono text-[11px] text-dim">
              <Icon name="folder" className="h-4 w-4 text-amber" />
              шаблон:
              <select
                value={active?.id ?? ""}
                onChange={(e) => onActivate(e.target.value)}
                className="border border-line bg-bg0 px-2 py-1 font-mono text-[11px] text-ink focus:border-cyan focus:outline-none"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} · {t.camIds.length}</option>
                ))}
              </select>
            </label>
            <a
              href="#templates"
              className="ml-auto hidden font-mono text-[10px] uppercase tracking-widest text-dim transition-colors hover:text-cyan sm:block"
            >
              конструктор шаблонов ▸
            </a>
          </div>
        </Reveal>

        {/* сетка + фокус-панель */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Reveal>
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1 overflow-x-auto pb-1">
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(${layout >= 64 ? 120 : 150}px, 1fr))`,
                    minWidth: layout >= 64 ? `${cols * 120}px` : undefined,
                  }}
                >
                  {visible.map((cam) => (
                    <Tile
                      key={cam.id}
                      cam={cam}
                      now={now}
                      alert={alertId === cam.id}
                      active={focusedId === cam.id}
                      detail={detail}
                      onOpen={() => {
                        setFocusedId(cam.id);
                        setFocusVisible(true);
                      }}
                    />
                  ))}
                </div>
              </div>
              <Radar cams={tplCams} />
            </div>
          </Reveal>
          <Reveal delay={120}>
            {focusVisible && focused ? (
              <FocusPanel cam={focused} onLog={pushEvent} onClose={() => setFocusVisible(false)} />
            ) : (
              <button
                onClick={() => setFocusVisible(true)}
                className="grid h-full min-h-[280px] w-full place-items-center border border-dashed border-cyan/40 bg-panel/40 font-mono text-[11px] uppercase tracking-[0.2em] text-cyan/70 transition-colors hover:border-cyan hover:text-cyan"
              >
                ◎ выберите канал на стене
              </button>
            )}
          </Reveal>
        </div>

        {/* журнал */}
        <Reveal delay={80}>
          <div className="mt-4 flex items-stretch gap-3 border border-line bg-panel/70">
            <div className="flex w-40 shrink-0 flex-col justify-center border-r border-line bg-bg1 px-3 py-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">Журнал</span>
              <span className="font-mono text-[10px] text-dim">{events.length} записей</span>
            </div>
            <div className="flex flex-1 items-center gap-6 overflow-hidden px-3 py-2.5">
              {events.slice(0, 5).map((e, i) => (
                <div key={`${e.t}-${i}-${e.cam}`} className={`log-in flex shrink-0 items-center gap-2 font-mono text-[11px] ${i === 0 ? "text-ink" : "text-dim"}`}>
                  <span className={e.type === "offline" ? "text-red" : e.type === "motion" ? "text-amber" : "text-cyan"}>
                    {e.type === "offline" ? "▼" : e.type === "motion" ? "▲" : "●"}
                  </span>
                  <span className="text-dim">{e.t}</span>
                  <span className="text-cyan">{e.cam}</span>
                  <span className="hidden md:inline">{e.text}</span>
                </div>
              ))}
              {events.length === 0 && <span className="font-mono text-[11px] text-dim">ожидание событий…</span>}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
