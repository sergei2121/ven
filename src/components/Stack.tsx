import { useState } from "react";
import { Icon, Reveal, SectionHead } from "../ui";

const STEPS: { title: string; text: string; code: string; lang: string }[] = [
  {
    title: "Флот из 70 узлов: Ubuntu 24.04 + Ansible",
    text: "Серверы — Ubuntu 24.04 LTS, одинаковый образ разворачивается Ansible-плейбуком: лимиты fd под сотни RTSP-сессий, NTP (метки архива обязаны сходиться), агент glances с экспортом в InfluxDB.",
    code: `ansible-playbook fleet.yml -i 10.20.[1:70].10, \\
  -e "role=venus-server ntp=ru.pool"
# на каждом узле: glances -t 2 --export influxdb`,
    lang: "bash · ansible · 70 узлов",
  },
  {
    title: "ONVIF-реестр на каждый сервер",
    text: "WS-Discovery находит камеры своего сегмента 10.20.x.0/24, снимает Profile S/T и оба RTSP-URI. Учётки — digest, пароли в vault. Добавление камеры из окна клиента прогоняет те же пять проверок.",
    code: `venus-registry scan --subnet 10.20.7.0/24 \\
  --profiles S,T --auth vault:seg07 > cams.sql`,
    lang: "bash · venus-registry (Go)",
  },
  {
    title: "Запись: ffmpeg -c copy ×110 воркеров",
    text: "Основной поток 1–4 Мбит/с копируется без транскода в сегменты по 600 c. ~2% ядра на воркер: i7-12700K отдаёт записи 3–4 ядра из 12. Атомарное переименование — архив не бьётся при крахе.",
    code: `ffmpeg -rtsp_transport tcp -stimeout 5000000 \\
  -i rtsp://10.20.7.21:554/s1 -c copy -f segment \\
  -segment_time 600 -reset_timestamps 1 -strftime 1 \\
  /archive/cam042/%Y-%m-%d/%H-%M-%S.mp4`,
    lang: "воркер ffmpeg-rec · каждый сервер",
  },
  {
    title: "Релей субпотоков: MediaMTX → WebRTC",
    text: "Сервер не транскодирует: MediaMTX переиздаёт субпоток 500–1000 кбит/с в WebRTC Low-Latency. Клиенту уходит ровно то, что отдала камера; нагрузка на узел ≈ 0 CPU.",
    code: `# /etc/mediamtx.yml
paths:
  cam042_sub:
    source: rtsp://10.20.7.21:554/s2
    readUser: wall-client`,
    lang: "yaml · mediamtx v1.x",
  },
  {
    title: "Клиент: Windows 11 + NVDEC",
    text: "Венера-Клиент — Windows 11 Pro, Electron/WebCodecs: декодирование через D3D11VA уходит в NVDEC (GTX 1060/1660), i5-12400 занимается композитингом 100 окон. Шаблон — обычный JSON: камеры с любых серверов.",
    code: `{ "name": "Периметр · 100", "cams": [
  { "server": "10.20.3.10", "cam": "014" },
  { "server": "10.20.41.10", "cam": "002" }
  /* …до 100 камер с разных серверов */ ] }`,
    lang: "json · шаблон видеостены",
  },
  {
    title: "Мониторинг: glances + smartctl",
    text: "Каждые 2 c glances снимает CPU, сеть, I/O и температуры HDD; smartctl отдаёт SMART. Алерты: t° > 47°C, Reallocated > 0, заполнение СХД > 90% — уходят в Grafana и Telegram дежурному.",
    code: `curl http://10.20.7.10:61208/api/4/sensors
# [{"label":"sda","value":41},{"label":"sde",
#   "value":48}]  → алерт PRE-FAIL`,
    lang: "http · glances REST API",
  },
];

export default function Stack() {
  const [copied, setCopied] = useState<number | null>(null);

  const copy = async (i: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* буфер обмена недоступен */
    }
    setCopied(i);
    setTimeout(() => setCopied(null), 1400);
  };

  return (
    <section id="stack" className="relative scroll-mt-20">
      <div className="mx-auto max-w-[1500px] px-4 py-20 md:px-8">
        <SectionHead
          index="07"
          kicker="сборка с нуля"
          title="Шесть шагов до работающего кластера"
          note="Собственного кода — реестр, API шаблонов и клиент. Всё остальное — открытые компоненты. Команды копируются в один клик."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={(i % 3) * 100}>
              <div className="group flex h-full flex-col border border-line bg-panel/70 transition-all duration-300 hover:-translate-y-1 hover:border-cyan/50 hover:shadow-[0_14px_40px_rgba(0,0,0,0.45)]">
                <div className="flex items-center gap-3 px-5 pt-5">
                  <span className="font-disp text-3xl text-amber transition-colors group-hover:text-cyan">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="h-px flex-1 bg-line" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">шаг</span>
                </div>
                <h3 className="px-5 pt-3 font-disp text-base uppercase leading-snug tracking-wide text-ink">{s.title}</h3>
                <p className="flex-1 px-5 pt-2 text-[13px] leading-relaxed text-mut">{s.text}</p>
                <div className="relative m-5 mt-4 border border-line bg-bg0">
                  <div className="flex items-center justify-between border-b border-line/70 px-3 py-1.5">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">{s.lang}</span>
                    <button
                      onClick={() => copy(i, s.code)}
                      className={`flex items-center gap-1.5 px-1.5 font-mono text-[10px] transition-colors ${
                        copied === i ? "text-green" : "text-mut hover:text-cyan"
                      }`}
                    >
                      <Icon name={copied === i ? "check" : "copy"} className="h-3 w-3" />
                      {copied === i ? "скопировано" : "копировать"}
                    </button>
                  </div>
                  <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed text-cyan/90">{s.code}</pre>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* заключение */}
        <Reveal delay={120}>
          <div className="relative mt-10 overflow-hidden border border-amber/40 bg-panel/80 p-8 md:p-10">
            <div className="pointer-events-none absolute -right-4 -top-12 hidden select-none font-disp text-[9rem] leading-none text-amber/5 lg:block">
              ОК
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.25em] text-amber">
              <span className="inline-block h-px w-10 bg-amber/60" />
              итоговое заключение
            </div>
            <h3 className="mt-4 max-w-3xl font-disp text-2xl uppercase leading-tight md:text-4xl">
              ТЗ выполнимо на заявленном железе — <span className="text-green">с запасом</span>
            </h3>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <div className="border-l-2 border-green pl-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-green">сервер × 70</div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mut">
                  i7-12700K: ~3–4 ядра из 12 на запись 110+ потоков, сеть ≈ 350–380 Мбит/с при цели 400, СХД 70–100 ТБ
                  держит 30 сут при motion 60–75%. Узел полностью автономен.
                </p>
              </div>
              <div className="border-l-2 border-cyan pl-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">клиент · 100 окон</div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mut">
                  GTX 1660 (NVDEC) забирает декодирование — ≈ 16% от ёмкости на 100 субпотоках; i5-12400 — ≈ 53% на
                  композитинг. GTX 1060 тоже проходит, UHD 730 без GPU — нет.
                </p>
              </div>
              <div className="border-l-2 border-amber pl-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">план внедрения</div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mut">
                  Н1–2: 5 узлов + клиент, шаблоны и реестр. Н3–4: масштаб до 70, glances-алерты. Н5–6: сдача —
                  задержка стены &lt; 400 мс, перемотка архива &lt; 2 c, регламент дежурному.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* подвал */}
      <footer className="border-t border-line/70 bg-bg0/80">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-8 gap-y-3 px-4 py-6 md:px-8">
          <div className="flex items-center gap-2.5">
            <Icon name="venus" className="h-6 w-6 text-amber" />
            <span className="font-disp tracking-[0.18em] text-ink">ВЕНЕРА</span>
          </div>
          <nav className="flex flex-wrap gap-4 font-mono text-[11px] text-dim">
            <a href="#wall" className="transition-colors hover:text-cyan">стена</a>
            <a href="#servers" className="transition-colors hover:text-cyan">серверы</a>
            <a href="#templates" className="transition-colors hover:text-cyan">шаблоны</a>
            <a href="#arch" className="transition-colors hover:text-cyan">архитектура</a>
            <a href="#calc" className="transition-colors hover:text-cyan">расчёт</a>
            <a href="#archive" className="transition-colors hover:text-cyan">архив</a>
          </nav>
          <span className="ml-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-dim">
            <Icon name="eye" className="h-3.5 w-3.5 text-cyan" />
            70 серверов · 100 окон · ONVIF · glances · 2026
          </span>
        </div>
      </footer>
    </section>
  );
}
