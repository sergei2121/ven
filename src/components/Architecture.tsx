import { useState } from "react";
import { CLIENT_OS, SERVER_OS } from "../data";
import { Reveal, SectionHead } from "../ui";

type NodeId = "cams" | "server" | "relay" | "raid" | "client" | "glances";

const INFO: Record<NodeId, { title: string; tag: string; rows: [string, string][] }> = {
  cams: {
    title: "IP-камеры · ONVIF",
    tag: "tier-0 · ~110 на сервер",
    rows: [
      ["Протокол", "ONVIF Profile S/T, RTSP/TCP"],
      ["Тракты", "MAIN 1080p 1–4 Мбит/с + SUB D1 500–1000 кбит/с"],
      ["Авторизация", "Digest-аутентификация, пароли в vault"],
      ["Адресация", "10.20.x.0/24 на каждый сервер-сегмент"],
    ],
  },
  server: {
    title: "Венера-Сервер",
    tag: "tier-1 · до 70 узлов",
    rows: [
      ["ОС", SERVER_OS],
      ["Запись", "ffmpeg -c copy ×~110 воркеров, сегменты 600 c"],
      ["Сеть", "≈ 400 Мбит/с суммарно (архивация + просмотр)"],
      ["Релей", "MediaMTX: субпоток → WebRTC WHEP без транскода"],
    ],
  },
  relay: {
    title: "MediaMTX · релей субпотоков",
    tag: "часть сервера · тракт просмотра",
    rows: [
      ["Что делает", "переиздаёт SUB-трек камеры в WebRTC Low-Latency"],
      ["Битрейт", "500–1000 кбит/с на окно, как есть с камеры"],
      ["Нагрузка", "≈ 0 CPU — только копирование RTP"],
      ["Масштаб", "100 окон клиента × 1 Мбит = 100 Мбит/с"],
    ],
  },
  raid: {
    title: "Локальная СХД · RAID-6",
    tag: "tier-1 · 70–100 ТБ на узел",
    rows: [
      ["Конфигурация", "8×14 ТБ (84 ТБ) или 12×10 ТБ (100 ТБ) + 2 чётности"],
      ["Запись", "~36–44 МБ/с непрерывно, один массив на узел"],
      ["Глубина", "30 сут при 110 камерах × 2.6 Мбит/с"],
      ["Контроль", "glances + smartctl: t°, SMART, Reallocated"],
    ],
  },
  client: {
    title: "Венера-Клиент",
    tag: "tier-2 · рабочее место оператора",
    rows: [
      ["Железо", "i5-12400 · 16 ГБ · GTX 1660 (NVDEC Turing)"],
      ["ОС", CLIENT_OS],
      ["Стена", "до 100 окон (10×10), только субпотоки"],
      ["Нагрузка", "NVDEC ≈ 16% · CPU ≈ 57% на 100 окнах"],
    ],
  },
  glances: {
    title: "Мониторинг · glances",
    tag: "агент на каждом сервере",
    rows: [
      ["Метрики", "CPU, RAM, сеть, t° HDD, SMART, I/O массива"],
      ["Экспорт", "InfluxDB → Grafana, алерты в Telegram"],
      ["Пороги", "t° HDD > 47°C, SMART PRE-FAIL, диск > 90%"],
      ["Опрос", "каждые 2 c, ретеншн метрик 90 сут"],
    ],
  },
};

export default function Architecture() {
  const [mode, setMode] = useState<"rec" | "view">("rec");
  const [node, setNode] = useState<NodeId>("server");
  const info = INFO[node];

  const nodeCls = (n: NodeId) =>
    `cursor-pointer transition-opacity duration-300 ${
      node === n ? "opacity-100" : "opacity-75 hover:opacity-100"
    }`;

  return (
    <section id="arch" className="relative scroll-mt-20 border-y border-line/70 bg-bg1/50">
      <div className="mx-auto max-w-[1500px] px-4 py-20 md:px-8">
        <SectionHead
          index="04"
          kicker="как это устроено"
          title="Архитектура: 70 → 1"
          note="Каждый сервер автономен: пишет архив локально и отдаёт клиенту только субпоток. Кликните узел схемы — откроется его паспорт. Переключайте тракты записи и просмотра."
        />

        <Reveal>
          <div className="border border-line bg-panel/60 p-4 md:p-6">
            {/* переключатель трактов */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-dim">тракт:</span>
              <button
                onClick={() => setMode("rec")}
                className={`border px-3 py-1.5 font-mono text-[11px] transition-all active:scale-95 ${
                  mode === "rec" ? "border-amber bg-amber text-bg0" : "border-line text-mut hover:border-amber/60 hover:text-amber"
                }`}
              >
                ■ запись → архив
              </button>
              <button
                onClick={() => setMode("view")}
                className={`border px-3 py-1.5 font-mono text-[11px] transition-all active:scale-95 ${
                  mode === "view" ? "border-cyan bg-cyan text-bg0" : "border-line text-mut hover:border-cyan/60 hover:text-cyan"
                }`}
              >
                ▶ просмотр → клиент
              </button>
              <span className="ml-auto hidden font-mono text-[10px] text-dim md:block">
                {mode === "rec"
                  ? "MAIN 1080p · 1–4 Мбит/с · ffmpeg -c copy · остаётся на сервере"
                  : "SUB D1 · 500–1000 кбит/с · WebRTC LL · декодирует GTX 1660"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <svg viewBox="0 0 1200 600" className="min-w-[860px] w-full" role="img" aria-label="Схема кластера Венера">
                {/* фоновые зоны */}
                <rect x="20" y="60" width="250" height="330" fill="rgba(61,220,240,0.03)" stroke="#223049" strokeDasharray="4 4" />
                <rect x="350" y="60" width="430" height="500" fill="rgba(255,178,36,0.03)" stroke="#223049" strokeDasharray="4 4" />
                <rect x="860" y="60" width="320" height="430" fill="rgba(61,220,151,0.03)" stroke="#223049" strokeDasharray="4 4" />
                <text x="32" y="84" fill="#5b7089" fontFamily="JetBrains Mono" fontSize="11" letterSpacing="3">TIER-0 · КАМЕРЫ</text>
                <text x="362" y="84" fill="#5b7089" fontFamily="JetBrains Mono" fontSize="11" letterSpacing="3">TIER-1 · ВЕНЕРА-СЕРВЕРЫ (70)</text>
                <text x="872" y="84" fill="#5b7089" fontFamily="JetBrains Mono" fontSize="11" letterSpacing="3">TIER-2 · КЛИЕНТ</text>

                {/* линии */}
                <path d="M 250 150 C 310 150, 330 210, 375 210" fill="none"
                  stroke={mode === "rec" ? "#ffb224" : "#3ddcf0"} strokeWidth="2.5"
                  className="flow-line" opacity={0.95} />
                <path d="M 250 200 C 320 260, 420 385, 495 385" fill="none"
                  stroke="#3ddcf0" strokeWidth="2.5"
                  className={mode === "view" ? "flow-line" : ""}
                  opacity={mode === "view" ? 0.95 : 0.15} />
                <path d="M 570 320 L 570 440" fill="none"
                  stroke="#ffb224" strokeWidth="3"
                  className={mode === "rec" ? "flow-line" : ""}
                  opacity={mode === "rec" ? 0.95 : 0.15} />
                <path d="M 645 385 C 760 385, 800 300, 880 285" fill="none"
                  stroke="#3ddcf0" strokeWidth="2.5"
                  className={mode === "view" ? "flow-line" : ""}
                  opacity={mode === "view" ? 0.95 : 0.15} />

                {/* подписи линий */}
                <text x="262" y="140" fill={mode === "rec" ? "#ffb224" : "#3ddcf0"} fontFamily="JetBrains Mono" fontSize="10.5">
                  {mode === "rec" ? "MAIN+SUB ≈ 400 Мбит/с" : "SUB 0.5–1 Мбит/с"}
                </text>
                <text x="690" y="372" fill="#3ddcf0" fontFamily="JetBrains Mono" fontSize="10.5" opacity={mode === "view" ? 1 : 0.3}>
                  WebRTC LL &lt; 400 мс
                </text>
                <text x="585" y="390" fill="#ffb224" fontFamily="JetBrains Mono" fontSize="10.5" opacity={mode === "rec" ? 1 : 0.3}>
                  -c copy · 600 c
                </text>

                {/* камеры */}
                <g className={nodeCls("cams")} onClick={() => setNode("cams")}>
                  {[0, 1, 2].map((i) => (
                    <g key={i} transform={`translate(70 ${115 + i * 62})`}>
                      <rect x="0" y="0" width="110" height="40" fill="#121a28" stroke={node === "cams" ? "#3ddcf0" : "#223049"} strokeWidth="1.5" />
                      <rect x="12" y="11" width="52" height="18" rx="3" fill="none" stroke="#8da2bf" strokeWidth="1.5" />
                      <path d="M64 16 l26 -8 v24 l-26 -8" fill="none" stroke="#8da2bf" strokeWidth="1.5" />
                      <circle cx="100" cy="8" r="3" fill="#ff5d5d" className="blink" />
                    </g>
                  ))}
                  <text x="70" y="325" fill="#8da2bf" fontFamily="JetBrains Mono" fontSize="12">ONVIF S/T × ~110</text>
                  <text x="70" y="342" fill="#5b7089" fontFamily="JetBrains Mono" fontSize="10.5">Digest-auth · 2 тракта</text>
                </g>

                {/* сервер */}
                <g className={nodeCls("server")} onClick={() => setNode("server")}>
                  <rect x="375" y="120" width="390" height="200" fill="#121a28" stroke={node === "server" ? "#ffb224" : "#223049"} strokeWidth="1.5" />
                  <text x="395" y="150" fill="#e7eef7" fontFamily="Russo One" fontSize="16" letterSpacing="2">ВЕНЕРА-СЕРВЕР ×70</text>
                  <text x="395" y="170" fill="#5b7089" fontFamily="JetBrains Mono" fontSize="10.5">{SERVER_OS} · i7-12700K · 32 ГБ</text>
                  {[0, 1, 2].map((i) => (
                    <g key={i} transform={`translate(395 ${185 + i * 26})`}>
                      <rect x="0" y="0" width="350" height="20" fill="#0f1520" stroke="#223049" />
                      <circle cx="12" cy="10" r="3" fill={i === 1 ? "#ffb224" : "#3ddc97"} />
                      <text x="24" y="14" fill="#8da2bf" fontFamily="JetBrains Mono" fontSize="10">
                        {["ffmpeg-rec ×110 · main → сегменты MP4", "mediamtx · sub → WebRTC WHEP", "glances · hddtemp · smartctl → InfluxDB"][i]}
                      </text>
                    </g>
                  ))}
                </g>

                {/* relay chip */}
                <g className={nodeCls("relay")} onClick={() => setNode("relay")}>
                  <rect x="495" y="365" width="150" height="40" fill="#0f1520" stroke={node === "relay" ? "#3ddcf0" : "#223049"} strokeWidth="1.5" />
                  <text x="570" y="382" textAnchor="middle" fill="#3ddcf0" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold">MediaMTX</text>
                  <text x="570" y="397" textAnchor="middle" fill="#5b7089" fontFamily="JetBrains Mono" fontSize="9">релей субпотоков</text>
                </g>

                {/* glances chip */}
                <g className={nodeCls("glances")} onClick={() => setNode("glances")}>
                  <rect x="610" y="270" width="140" height="34" fill="#0f1520" stroke={node === "glances" ? "#3ddc97" : "#223049"} strokeWidth="1.5" />
                  <text x="680" y="285" textAnchor="middle" fill="#3ddc97" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold">glances</text>
                  <text x="680" y="298" textAnchor="middle" fill="#5b7089" fontFamily="JetBrains Mono" fontSize="9">t° HDD · SMART · net</text>
                </g>

                {/* RAID */}
                <g className={nodeCls("raid")} onClick={() => setNode("raid")}>
                  <rect x="430" y="440" width="280" height="100" fill="#121a28" stroke={node === "raid" ? "#ffb224" : "#223049"} strokeWidth="1.5" />
                  {Array.from({ length: 12 }).map((_, i) => (
                    <rect key={i} x={444 + i * 21.5} y="456" width="16" height="52" fill="#0f1520"
                      stroke={i >= 10 ? "#3ddcf0" : "#ffb224"} strokeOpacity="0.7" />
                  ))}
                  <text x="570" y="528" textAnchor="middle" fill="#8da2bf" fontFamily="JetBrains Mono" fontSize="11">
                    RAID-6 · 70–100 ТБ на узел
                  </text>
                </g>

                {/* клиент */}
                <g className={nodeCls("client")} onClick={() => setNode("client")} opacity={mode === "rec" ? 0.55 : 1}>
                  <rect x="880" y="130" width="280" height="300" fill="#121a28" stroke={node === "client" ? "#3ddc97" : "#223049"} strokeWidth="1.5" />
                  <text x="900" y="160" fill="#e7eef7" fontFamily="Russo One" fontSize="16" letterSpacing="2">ВЕНЕРА-КЛИЕНТ</text>
                  <text x="900" y="180" fill="#5b7089" fontFamily="JetBrains Mono" fontSize="10.5">i5-12400 · GTX 1660 · {CLIENT_OS}</text>
                  {/* сетка 10x10 окон */}
                  {Array.from({ length: 100 }).map((_, i) => (
                    <rect
                      key={i}
                      x={900 + (i % 10) * 24.5}
                      y={196 + Math.floor(i / 10) * 17.5}
                      width="21"
                      height="14"
                      fill={i % 7 === 3 ? "#1d3a4a" : "#16283c"}
                      stroke="#223049"
                      strokeWidth="0.6"
                    >
                      {i % 11 === 0 && <animate attributeName="fill" values="#16283c;#233a31;#16283c" dur="3s" repeatCount="indefinite" />}
                    </rect>
                  ))}
                  <text x="900" y="398" fill="#8da2bf" fontFamily="JetBrains Mono" fontSize="11">100 окон · субпоток D1 · NVDEC ≈ 16%</text>
                  <text x="900" y="415" fill="#5b7089" fontFamily="JetBrains Mono" fontSize="10.5">шаблоны · PTZ · перемотка архива</text>
                </g>
              </svg>
            </div>
          </div>
        </Reveal>

        {/* паспорт узла */}
        <Reveal delay={120}>
          <div className="mt-4 grid gap-px border border-line bg-line/60 md:grid-cols-[300px_1fr]">
            <div className="bg-panel p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-dim">узел</div>
              <div className="mt-1 font-disp text-xl tracking-wide text-ink">{info.title}</div>
              <div className="mt-2 inline-block border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cyan">
                {info.tag}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-px bg-line/40 sm:grid-cols-2">
              {info.rows.map(([k, v]) => (
                <div key={k} className="bg-panel px-5 py-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">{k}</div>
                  <div className="mt-0.5 font-mono text-[12.5px] text-ink/90">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
