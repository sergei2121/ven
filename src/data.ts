/* ========= модель данных кластера «Венера» ========= */

export type ServerStatus = "online" | "offline" | "maint";

export interface VServer {
  id: number;            // 1..70
  name: string;          // Венера-С07
  ip: string;            // 10.20.x.y
  status: ServerStatus;
  camCount: number;
  netMbps: number;       // ~400 Мбит/с: архивация + просмотр
  archiveFill: number;   // %
  hddTemp: number;       // средняя по массиву
  hddWarn: number;       // дисков с предупреждением SMART
  uptimeDays: number;
}

export interface Cam {
  id: number;
  serverId: number;
  num: string;
  name: string;
  status: "online" | "offline";
  ptz: boolean;
  hue: number;
  mainMbps: number;      // 1.0–4.0, максимум — у немногих
  subKbps: number;       // 500–1000 кбит/с
  boxDelay: number;
  boxDur: number;
}

export interface Template {
  id: string;
  name: string;
  camIds: number[];      // максимум 100
}

export const SERVER_COUNT = 70;
export const SERVER_OS = "Ubuntu Server 24.04 LTS";
export const CLIENT_OS = "Ubuntu 24.04 LTS · NVIDIA 550 (NVDEC)";
export const MAX_TEMPLATE_CAMS = 100;

const LOCATIONS = [
  "Главный вход", "Северный периметр", "Склад А", "Склад Б", "Паркинг P1",
  "Паркинг P2", "Погрузочный док", "Серверная", "Холл 1 этажа", "КПП-1",
  "КПП-2", "Коридор 2 этажа", "Лифтовая группа", "Кассовая зона", "Торговый зал",
  "Подсобное помещение", "Кровля — восток", "Кровля — запад", "Ангар", "Гараж спецтехники",
  "Запасной выход", "Рампа", "Офис 310", "Переговорная", "Столовая",
  "Раздевалка", "Цех №1", "Цех №2", "Котельная", "Водомерный узел",
];

export const SERVERS: VServer[] = Array.from({ length: SERVER_COUNT }, (_, i) => {
  const id = i + 1;
  return {
    id,
    name: `Венера-С${String(id).padStart(2, "0")}`,
    ip: `10.20.${Math.floor(i / 20)}.${10 + (i % 20) * 4}`,
    status: id % 23 === 9 ? "offline" : id % 17 === 4 ? "maint" : "online",
    camCount: 96 + ((id * 7) % 25),
    netMbps: 362 + ((id * 13) % 78),
    archiveFill: 58 + ((id * 11) % 36),
    hddTemp: 34 + ((id * 5) % 12),
    hddWarn: id % 11 === 0 ? 1 : 0,
    uptimeDays: 12 + ((id * 3) % 210),
  };
});

/* камеры: по ~96–120 на сервер, id = serverId*1000 + idx */
export const CAMS: Cam[] = [];
for (const s of SERVERS) {
  for (let k = 0; k < s.camCount; k++) {
    const i = k;
    const loc = LOCATIONS[(s.id * 3 + k) % LOCATIONS.length];
    CAMS.push({
      id: s.id * 1000 + k,
      serverId: s.id,
      num: String(CAMS.length + 1).padStart(4, "0"),
      name: `${loc}${k >= LOCATIONS.length ? ` · зона ${Math.floor(k / LOCATIONS.length) + 1}` : ""}`,
      status: k % 29 === 7 ? "offline" : "online",
      ptz: k % 9 === 0,
      hue: ((s.id * 47 + k * 31) % 360),
      mainMbps: 1 + ((k * 7 + s.id) % 30) / 10, // 1.0–3.9, 4 Мбит — редкость
      subKbps: 500 + ((k + s.id) % 6) * 100,    // 500–1000 кбит/с
      boxDelay: ((s.id + k) * 0.73) % 9,
      boxDur: 7 + (((s.id + k) * 1.31) % 5),
    });
    void i;
  }
}

export const TOTAL_CAMS = CAMS.length;

/* стартовые шаблоны */
function byServer(): Map<number, Cam[]> {
  const m = new Map<number, Cam[]>();
  for (const c of CAMS) {
    const arr = m.get(c.serverId);
    if (arr) arr.push(c);
    else m.set(c.serverId, [c]);
  }
  return m;
}

export function seedTemplates(): Template[] {
  const m = byServer();
  const t1: number[] = [];
  for (const s of SERVERS) {
    const cams = m.get(s.id) ?? [];
    if (cams[0]) t1.push(cams[0].id);
    if (t1.length >= MAX_TEMPLATE_CAMS) break;
  }
  for (const s of SERVERS.slice(0, MAX_TEMPLATE_CAMS - t1.length)) {
    const cams = m.get(s.id) ?? [];
    if (cams[1]) t1.push(cams[1].id);
  }
  const t2 = CAMS.filter((c) => /КПП|Периметр|вход|Вход|Кровля/.test(c.name)).filter((_, i) => i % 3 === 0).slice(0, 48).map((c) => c.id);
  const t3 = CAMS.filter((c) => /Склад|Рампа|док|Ангар/.test(c.name)).filter((_, i) => i % 4 === 0).slice(0, 36).map((c) => c.id);
  return [
    { id: "tpl-overview", name: "Обзор кластера", camIds: t1.slice(0, 100) },
    { id: "tpl-perimeter", name: "Периметр и КПП", camIds: t2 },
    { id: "tpl-warehouse", name: "Склады и логистика", camIds: t3 },
  ];
}

export type EventType = "motion" | "archive" | "offline" | "ptz" | "auth";

export function eventText(type: EventType): string {
  switch (type) {
    case "motion": return "детекция движения, кадр сохранён";
    case "archive": return "сегмент архива закрыт (600 c)";
    case "offline": return "потеря RTSP-сессии, реконнект";
    case "ptz": return "PTZ-пресет отработан";
    case "auth": return "ONVIF-дайджест-аутентификация ОК";
  }
}

/* ========= расчёт ресурсов ========= */

export type GpuId = "igpu" | "gtx1060" | "gtx1660";

export const GPU_CAPS: Record<GpuId, { label: string; mbps: number; note: string }> = {
  igpu: { label: "UHD 730 (i5-12400)", mbps: 110, note: "Quick Sync · без дискретной карты" },
  gtx1060: { label: "GTX 1060", mbps: 260, note: "NVDEC Pascal · H.264/HEVC 8-bit" },
  gtx1660: { label: "GTX 1660", mbps: 480, note: "NVDEC Turing · рекомендуемая" },
};

export interface CalcState {
  servers: number;         // 1–70
  camsPerServer: number;   // 40–140
  mainMbps: number;        // 1.0–4.0
  subMbps: number;         // 0.5–1.0
  storageTB: number;       // 70–100 на сервер
  retention: number;       // сут
  motion: number;          // % времени записи
  windows: number;         // 4–100 окон на клиенте
  gpu: GpuId;
}

export const DEFAULT_CALC: CalcState = {
  servers: 70,
  camsPerServer: 110,
  mainMbps: 2.6,
  subMbps: 0.75,
  storageTB: 100,
  retention: 30,
  motion: 100,
  windows: 100,
  gpu: "gtx1660",
};

export interface CalcResult {
  totalCams: number;
  netPerServer: number;     // Мбит/с
  clusterNetGbps: number;
  writeMBs: number;         // на сервер
  archivePerServerTB: number;
  clusterArchiveTB: number;
  clusterStorageTB: number;
  fitPct: number;
  disksLabel: string;
  serverCores: number;
  ramServerGB: number;
  clientNetMbps: number;
  nvdecPct: number;
  clientCpuPct: number;
  ramClientGB: number;
  gpuCapMbps: number;
}

export function compute(c: CalcState): CalcResult {
  const totalCams = c.servers * c.camsPerServer;
  const netPerServer = c.camsPerServer * (c.mainMbps + c.subMbps);
  const clusterNetGbps = (netPerServer * c.servers) / 1000;
  const writeMBs = (c.camsPerServer * c.mainMbps) / 8;
  const archivePerServerTB =
    (c.camsPerServer * c.mainMbps * 86400 * c.retention * (c.motion / 100)) / 8 / 1e6;
  const clusterArchiveTB = archivePerServerTB * c.servers;
  const clusterStorageTB = c.storageTB * c.servers;
  const fitPct = (archivePerServerTB / c.storageTB) * 100;
  const disksLabel = c.storageTB <= 84 ? "8×14 ТБ RAID-6 (84 ТБ)" : "12×10 ТБ RAID-6 (100 ТБ)";
  const serverCores = 1.2 + c.camsPerServer * 0.022 + writeMBs * 0.004;
  const ramServerGB = 3 + c.camsPerServer * 0.02 + 2.4;
  const clientNetMbps = c.windows * c.subMbps;
  const gpuCapMbps = GPU_CAPS[c.gpu].mbps;
  const nvdecPct = (clientNetMbps / gpuCapMbps) * 100;
  const clientCpuPct = 12 + c.windows * 0.45;
  const ramClientGB = 2.5 + c.windows * 0.09;
  return {
    totalCams, netPerServer, clusterNetGbps, writeMBs,
    archivePerServerTB, clusterArchiveTB, clusterStorageTB, fitPct, disksLabel,
    serverCores, ramServerGB, clientNetMbps, nvdecPct, clientCpuPct, ramClientGB, gpuCapMbps,
  };
}

export const PRESETS: { name: string; state: CalcState }[] = [
  { name: "ТЗ: 70×110 · 100 окон", state: { ...DEFAULT_CALC } },
  { name: "Эконом: H.265 1.5 Мбит", state: { ...DEFAULT_CALC, mainMbps: 1.5, motion: 70 } },
  { name: "Максимум: 70×140", state: { ...DEFAULT_CALC, camsPerServer: 140 } },
];

export function fmt(n: number, d = 1): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: d, minimumFractionDigits: 0 });
}
