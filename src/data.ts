/* ============================================================
   ВЕНЕРА · модель данных распределённой VMS
   до 70 серверов записи × ~110 ONVIF-камер · клиент на 100 окон
   ============================================================ */

export const SERVER_OS = "Ubuntu 24.04 LTS";
export const CLIENT_OS = "Windows 11 Pro 24H2";
export const MAX_TEMPLATE_CAMS = 100;

/* ---------------- серверы ---------------- */

export type ServerStatus = "online" | "offline" | "maint";

export interface VServer {
  id: number;            // 1..70
  name: string;          // С-01
  ip: string;
  status: ServerStatus;
  camCount: number;
  netMbps: number;       // архивация + просмотр, ≈ 400
  archiveFill: number;   // % заполнения СХД
  hddTemp: number;       // средняя t° массива
  hddWarn: number;       // SMART-предупреждения
  uptimeDays: number;
}

const CAMS_PER: number[] = [];
for (let i = 1; i <= 70; i++) CAMS_PER.push(104 + ((i * 7) % 17));

export const SERVERS: VServer[] = CAMS_PER.map((n, idx) => {
  const id = idx + 1;
  return {
    id,
    name: `С-${String(id).padStart(2, "0")}`,
    ip: `10.20.${id}.10`,
    status: id === 14 || id === 48 ? "offline" : id === 27 ? "maint" : "online",
    camCount: n,
    netMbps: Math.round(n * 3.15 + ((id * 13) % 22)),
    archiveFill: 56 + ((id * 11) % 37),
    hddTemp: 33 + ((id * 5) % 13),
    hddWarn: id === 23 ? 1 : id === 52 ? 2 : 0,
    uptimeDays: 28 + ((id * 37) % 340),
  };
});

export const TOTAL_CAMS = SERVERS.reduce((a, s) => a + s.camCount, 0);

/* ---------------- камеры ---------------- */

export interface Cam {
  id: number;            // serverId*1000 + номер
  num: string;
  name: string;
  serverId: number;
  status: "online" | "offline";
  ptz: boolean;
  hue: number;
  boxDelay: number;
  boxDur: number;
  mainMbps: number;      // 1.0–4.0, максимум у немногих
  subKbps: number;       // 500–1000
}

const LOCATIONS = [
  "Главный вход", "Северный периметр", "Склад А", "Склад Б", "Паркинг P1",
  "Паркинг P2", "Погрузочный док", "Серверная", "Холл 1 этажа", "КПП-1",
  "КПП-2", "Коридор 2 этажа", "Лифтовая группа", "Кассовая зона", "Торговый зал",
  "Подсобное помещение", "Кровля — восток", "Кровля — запад", "Ангар", "Гараж спецтехники",
  "Запасной выход", "Рампа", "Офис 310", "Переговорная", "Столовая",
  "Раздевалка", "Цех №1", "Цех №2", "Котельная", "Водомерный узел",
];

function makeCam(serverId: number, n: number): Cam {
  const loc = LOCATIONS[n % LOCATIONS.length];
  const zone = Math.floor(n / LOCATIONS.length) + 1;
  const mainMbps = n % 17 === 0 ? 4 : n % 3 === 0 ? 3 : n % 2 === 0 ? 2 : 1.5;
  return {
    id: serverId * 1000 + n + 1,
    num: String(n + 1).padStart(3, "0"),
    name: zone === 1 ? loc : `${loc} · зона ${zone}`,
    serverId,
    status: (serverId * 7 + n) % 29 === 5 ? "offline" : "online",
    ptz: n % 12 === 0,
    hue: (serverId * 37 + n * 13) % 360,
    boxDelay: ((serverId + n) * 0.73) % 9,
    boxDur: 7 + ((serverId + n) * 1.31) % 5,
    mainMbps,
    subKbps: 500 + ((serverId + n) % 6) * 100,
  };
}

export const CAMS: Cam[] = [];
export const CAMS_BY_SERVER = new Map<number, Cam[]>();
SERVERS.forEach((s) => {
  const arr = Array.from({ length: s.camCount }, (_, k) => makeCam(s.id, k));
  CAMS_BY_SERVER.set(s.id, arr);
  CAMS.push(...arr);
});

/* ---------------- шаблоны ---------------- */

export interface Template {
  id: string;
  name: string;
  camIds: number[];      // до MAX_TEMPLATE_CAMS
}

export function defaultTemplates(): Template[] {
  const svodka: number[] = [];
  for (let s = 1; s <= 12; s++) {
    const arr = CAMS_BY_SERVER.get(s)!;
    svodka.push(arr[0].id, arr[9].id);
  }
  const perimetr: number[] = [];
  for (let s = 1; s <= 50 && perimetr.length < MAX_TEMPLATE_CAMS; s += 1) {
    const arr = CAMS_BY_SERVER.get(s)!;
    perimetr.push(arr[3].id, arr[14].id);
  }
  const sklady: number[] = [];
  for (const c of CAMS) {
    if (c.name.startsWith("Склад") && sklady.length < 16) sklady.push(c.id);
    if (sklady.length >= 16) break;
  }
  const kpp: number[] = [];
  for (const c of CAMS) {
    if ((c.name.startsWith("КПП") || c.name.startsWith("Главный вход")) && kpp.length < 8) {
      kpp.push(c.id);
    }
    if (kpp.length >= 8) break;
  }
  return [
    { id: "tpl-svodka", name: "Сводная · 24", camIds: svodka },
    { id: "tpl-100", name: "Периметр · 100", camIds: perimetr },
    { id: "tpl-sklady", name: "Склады", camIds: sklady },
    { id: "tpl-kpp", name: "КПП и входы", camIds: kpp },
  ];
}

/* ---------------- события журнала ---------------- */

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

/* ============================================================
   Расчёт ресурсов
   ============================================================ */

export type GpuId = "igpu" | "gtx1060" | "gtx1660";

export const GPU_CAPS: Record<GpuId, { label: string; note: string; mbps: number }> = {
  igpu: {
    label: "UHD 730 · i5-12400",
    note: "iGPU, QuickSync — 100 окон не вытянет",
    mbps: 60,
  },
  gtx1060: {
    label: "GTX 1060 6GB",
    note: "NVDEC Pascal · H.264",
    mbps: 300,
  },
  gtx1660: {
    label: "GTX 1660 6GB",
    note: "NVDEC Turing · H.264/H.265",
    mbps: 440,
  },
};

export interface CalcState {
  servers: number;        // 1..70
  camsPerServer: number;  // 40..140
  mainMbps: number;       // 1..4 (ср.; максимум — у немногих)
  subMbps: number;        // 0.5..1
  storageTB: number;      // 70..100 на сервер
  retention: number;      // сут 7..60
  motion: number;         // % времени записи
  windows: number;        // 4..100
  gpu: GpuId;
}

export const DEFAULT_CALC: CalcState = {
  servers: 70,
  camsPerServer: 115,
  mainMbps: 2.5,
  subMbps: 0.7,
  storageTB: 100,
  retention: 30,
  motion: 75,
  windows: 100,
  gpu: "gtx1660",
};

export const PRESETS: { name: string; state: CalcState }[] = [
  { name: "ТЗ: 70 × 115 · 2.5 Мбит", state: { ...DEFAULT_CALC } },
  {
    name: "Эконом: H.265 · 1.5 Мбит",
    state: { ...DEFAULT_CALC, mainMbps: 1.5, motion: 60 },
  },
  {
    name: "Предел: 70 × 140 · 4 Мбит",
    state: { ...DEFAULT_CALC, camsPerServer: 140, mainMbps: 4, motion: 100 },
  },
];

export interface CalcResult {
  netPerServer: number;      // Мбит/с
  archivePerServerTB: number;
  fitPct: number;            // архив / storageTB
  disksLabel: string;
  clusterStorageTB: number;
  clientNetMbps: number;
  gpuCapMbps: number;
  nvdecPct: number;
  serverCores: number;
  clientCpuPct: number;
  ramClientGB: number;
  totalCams: number;
  clusterNetGbps: number;
  clusterArchiveTB: number;
}

export function compute(c: CalcState): CalcResult {
  const netPerServer = c.camsPerServer * (c.mainMbps + c.subMbps);
  // 1 Мбит/с ≈ 10.8 ГБ/сут
  const archivePerServerTB =
    c.camsPerServer * c.mainMbps * 0.0108 * c.retention * (c.motion / 100);
  const fitPct = (archivePerServerTB / c.storageTB) * 100;

  const dataDisks = Math.max(4, Math.ceil(archivePerServerTB / 10));
  const totalDisks = dataDisks + 2;
  const disksLabel = `${totalDisks} дисков · RAID-6 12 ТБ`;

  const clientNetMbps = c.windows * c.subMbps;
  const gpuCapMbps = GPU_CAPS[c.gpu].mbps;
  const nvdecPct = (clientNetMbps / gpuCapMbps) * 100;

  const serverCores = 1.3 + c.camsPerServer * 0.02 + (netPerServer / 1000) * 1.2;
  const clientCpuPct = 8 + c.windows * 0.45;
  const ramClientGB = 2.6 + c.windows * 0.09;

  return {
    netPerServer,
    archivePerServerTB,
    fitPct,
    disksLabel,
    clusterStorageTB: c.servers * c.storageTB,
    clientNetMbps,
    gpuCapMbps,
    nvdecPct,
    serverCores,
    clientCpuPct,
    ramClientGB,
    totalCams: c.servers * c.camsPerServer,
    clusterNetGbps: (c.servers * netPerServer) / 1000,
    clusterArchiveTB: c.servers * archivePerServerTB,
  };
}

export function fmt(n: number, d = 1): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: d, minimumFractionDigits: 0 });
}
