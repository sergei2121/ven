import { useEffect, useMemo, useRef, useState } from "react";
import {
  CAMS, MAX_TEMPLATE_CAMS, SERVERS, type Cam, type Template,
} from "../data";
import { Bar, Chip, Icon, Reveal, SectionHead } from "../ui";

/* ================= окно добавления камеры ================= */

interface FormState {
  name: string;
  serverId: number;
  ip: string;
  port: string;
  login: string;
  password: string;
}

const CHECK_STEPS = [
  "WS-Discovery → поиск устройства в подсети…",
  "GetCapabilities → ONVIF Profile S/T",
  "Digest-аутентификация (login / password)…",
  "GetStreamUri → rtsp://<ip>:<port>/stream",
  "RTSP DESCRIBE / PLAY → OK, кадры получены",
];

function AddCameraModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (cam: Omit<Cam, "id" | "num" | "hue" | "boxDelay" | "boxDur">) => void;
}) {
  const [f, setF] = useState<FormState>({
    name: "",
    serverId: 1,
    ip: "10.20.0.",
    port: "554",
    login: "admin",
    password: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [checkState, setCheckState] = useState<"idle" | "running" | "ok" | "fail">("idle");
  const [checkStep, setCheckStep] = useState(0);
  const [failMsg, setFailMsg] = useState("");
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const errors: Partial<Record<keyof FormState, string>> = {};
  if (f.name.trim().length < 3) errors.name = "минимум 3 символа";
  if (!/^((25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(25[0-5]|2[0-4]\d|1?\d?\d)$/.test(f.ip))
    errors.ip = "формат: 10.20.0.77";
  const portN = Number(f.port);
  if (!Number.isInteger(portN) || portN < 1 || portN > 65535) errors.port = "1–65535";
  if (f.login.trim().length === 0) errors.login = "укажите логин";
  if (f.password.length < 4) errors.password = "минимум 4 символа";
  const valid = Object.keys(errors).length === 0;

  const runCheck = () => {
    setCheckState("running");
    setCheckStep(0);
    setFailMsg("");
    const authFail = f.password === "1234";
    CHECK_STEPS.forEach((_, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setCheckStep(i + 1);
          if (i === 2 && authFail) {
            setCheckState("fail");
            setFailMsg("HTTP 401: пара login/password отклонена камерой");
          } else if (i === CHECK_STEPS.length - 1 && !authFail) {
            setCheckState("ok");
          }
        }, 520 * (i + 1))
      );
    });
  };

  const field = (k: keyof FormState) => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setF({ ...f, [k]: e.target.value } as FormState);
      setCheckState("idle");
    },
  });

  const inputCls = (k: keyof FormState) =>
    `w-full border bg-bg0 px-2.5 py-2 font-mono text-[12px] text-ink placeholder:text-dim focus:outline-none transition-colors ${
      errors[k] ? "border-red/60" : "border-line focus:border-cyan"
    }`;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-bg0/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="modal-in w-full max-w-xl border border-cyan/40 bg-panel shadow-[0_0_60px_rgba(61,220,240,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Icon name="cam" className="h-4 w-4 text-amber" />
            <span className="font-disp text-sm uppercase tracking-wider text-ink">Добавить камеру в реестр</span>
          </div>
          <button onClick={onClose} className="border border-line px-2 py-0.5 font-mono text-[11px] text-mut transition-colors hover:border-red/60 hover:text-red">✕</button>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-dim">Наименование</label>
            <input {...field("name")} placeholder="КПП-3 · южный въезд" className={inputCls("name")} />
            {errors.name && f.name.length > 0 && <p className="mt-1 font-mono text-[10px] text-red">{errors.name}</p>}
          </div>

          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-dim">Сервер записи</label>
            <select {...field("serverId")} className={`${inputCls("serverId")} appearance-none`}>
              {SERVERS.map((s) => (
                <option key={s.id} value={s.id}>{s.name} · {s.ip}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-dim">RTSP-порт</label>
            <input {...field("port")} className={inputCls("port")} inputMode="numeric" />
            {errors.port && f.port !== "554" && <p className="mt-1 font-mono text-[10px] text-red">{errors.port}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-dim">IP-адрес камеры</label>
            <input {...field("ip")} placeholder="10.20.0.77" className={inputCls("ip")} />
            {errors.ip && f.ip !== "10.20.0." && <p className="mt-1 font-mono text-[10px] text-red">{errors.ip}</p>}
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
              <Icon name="user" className="h-3 w-3" /> Логин
            </label>
            <input {...field("login")} className={inputCls("login")} />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
              <Icon name="lock" className="h-3 w-3" /> Пароль
            </label>
            <div className="relative">
              <input
                {...field("password")}
                type={showPass ? "text" : "password"}
                placeholder="••••••"
                className={`${inputCls("password")} pr-9`}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase ${showPass ? "text-cyan" : "text-dim"} transition-colors hover:text-cyan`}
              >
                {showPass ? "скрыть" : "показать"}
              </button>
            </div>
            {errors.password && f.password.length > 0 && <p className="mt-1 font-mono text-[10px] text-red">{errors.password}</p>}
          </div>
        </div>

        {/* проверка ONVIF */}
        <div className="mx-5 border border-line bg-bg0">
          <div className="flex items-center justify-between border-b border-line/70 px-3 py-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">Проверка ONVIF-подключения</span>
            {checkState === "running" && <span className="font-mono text-[10px] text-amber blink">выполняется…</span>}
            {checkState === "ok" && <span className="font-mono text-[10px] text-green">устройство готово</span>}
            {checkState === "fail" && <span className="font-mono text-[10px] text-red">ошибка</span>}
          </div>
          <div className="p-3 font-mono text-[11px] leading-relaxed">
            {CHECK_STEPS.map((s, i) => (
              <div
                key={s}
                className={`flex items-center gap-2 transition-opacity duration-300 ${
                  i < checkStep ? "opacity-100" : "opacity-25"
                }`}
              >
                <span className={i < checkStep ? (checkState === "fail" && i === 2 ? "text-red" : "text-green") : "text-dim"}>
                  {i < checkStep ? (checkState === "fail" && i === 2 ? "✗" : "✓") : "·"}
                </span>
                <span className={i < checkStep ? "text-mut" : "text-dim"}>
                  {s.replace("<ip>", f.ip.endsWith(".") ? "…" : f.ip).replace("<port>", f.port)}
                </span>
              </div>
            ))}
            {checkState === "fail" && <div className="mt-2 text-red">{failMsg}</div>}
            {checkState === "idle" && (
              <div className="mt-1 text-dim">параметры → «Проверить» → сохранение в реестр</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 p-5">
          <button
            onClick={runCheck}
            disabled={!valid || checkState === "running"}
            className="border border-cyan/60 bg-cyan/10 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-cyan transition-all hover:bg-cyan hover:text-bg0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ⌁ Проверить ONVIF
          </button>
          <button
            onClick={() => {
              onAdd({
                name: f.name.trim(),
                serverId: Number(f.serverId),
                status: "online",
                ptz: false,
                mainMbps: 2.6,
                subKbps: 720,
              });
            }}
            disabled={checkState !== "ok"}
            className="ml-auto border border-amber/60 bg-amber/10 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-amber transition-all hover:bg-amber hover:text-bg0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Сохранить в реестр
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= конструктор шаблонов ================= */

interface Editing {
  id: string;
  name: string;
  camIds: number[];
}

export default function Templates({
  camById,
  templates,
  setTemplates,
  activeId,
  onActivate,
  customCams,
  onAddCam,
}: {
  camById: Map<number, Cam>;
  templates: Template[];
  setTemplates: (t: Template[]) => void;
  activeId: string;
  onActivate: (id: string) => void;
  customCams: Cam[];
  onAddCam: (cam: Omit<Cam, "id" | "num" | "hue" | "boxDelay" | "boxDur">) => void;
}) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [serverSel, setServerSel] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2600);
  };

  const serverCams = useMemo(() => {
    const base = CAMS.filter((c) => c.serverId === serverSel);
    const extra = customCams.filter((c) => c.serverId === serverSel);
    return [...extra, ...base];
  }, [serverSel, customCams]);

  const listCams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return serverCams.slice(0, 120);
    return serverCams.filter((c) => c.name.toLowerCase().includes(q) || c.num.includes(q)).slice(0, 120);
  }, [serverCams, search]);

  const selectedSet = useMemo(() => new Set(editing?.camIds ?? []), [editing]);
  const serversInTpl = useMemo(() => {
    if (!editing) return 0;
    return new Set(editing.camIds.map((id) => camById.get(id)?.serverId ?? Math.floor(id / 1000))).size;
  }, [editing, camById]);

  const toggle = (camId: number) => {
    if (!editing) return;
    const has = selectedSet.has(camId);
    if (!has && editing.camIds.length >= MAX_TEMPLATE_CAMS) return;
    setEditing({
      ...editing,
      camIds: has ? editing.camIds.filter((i) => i !== camId) : [...editing.camIds, camId],
    });
  };

  const save = () => {
    if (!editing || editing.name.trim().length < 2) return;
    const isNew = !templates.some((t) => t.id === editing.id);
    const next = isNew
      ? [...templates, { id: editing.id, name: editing.name.trim(), camIds: editing.camIds }]
      : templates.map((t) => (t.id === editing.id ? { ...t, name: editing.name.trim(), camIds: editing.camIds } : t));
    setTemplates(next);
    onActivate(editing.id);
    showToast(`шаблон «${editing.name.trim()}» · ${editing.camIds.length} камер — сохранён и запущен на стене`);
    setEditing(null);
  };

  return (
    <section id="templates" className="relative scroll-mt-20">
      <div className="mx-auto max-w-[1500px] px-4 py-20 md:px-8">
        <SectionHead
          index="03"
          kicker="операторская логика"
          title="Шаблоны и реестр камер"
          note={`Шаблон собирает камеры с любых из 70 серверов — максимум ${MAX_TEMPLATE_CAMS} камер. Добавление камеры требует авторизацию: наименование, IP, порт, логин и пароль.`}
        />

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* список шаблонов */}
          <Reveal>
            <div className="flex h-full flex-col border border-line bg-panel/70">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-mut">
                  <Icon name="folder" className="h-4 w-4 text-amber" />
                  Шаблоны · {templates.length}
                </span>
                <button
                  onClick={() =>
                    setEditing({ id: `tpl-${Date.now()}`, name: "", camIds: [] })
                  }
                  className="flex items-center gap-1.5 border border-amber/60 bg-amber/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-amber transition-all hover:bg-amber hover:text-bg0 active:scale-95"
                >
                  <Icon name="plus" className="h-3 w-3" /> новый
                </button>
              </div>
              <div className="flex-1 divide-y divide-line/60">
                {templates.map((t) => {
                  const srv = new Set(t.camIds.map((id) => camById.get(id)?.serverId ?? 0)).size;
                  const isActive = t.id === activeId;
                  return (
                    <div
                      key={t.id}
                      className={`group px-4 py-3 transition-colors ${isActive ? "bg-cyan/5" : "hover:bg-bg0/50"}`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditing({ id: t.id, name: t.name, camIds: [...t.camIds] })}
                          className="flex-1 text-left"
                        >
                          <div className={`font-disp text-sm tracking-wide ${isActive ? "text-cyan" : "text-ink"} group-hover:text-cyan`}>
                            {t.name}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-dim">
                            {t.camIds.length}/{MAX_TEMPLATE_CAMS} камер · {srv} серверов
                          </div>
                        </button>
                        <button
                          onClick={() => { onActivate(t.id); showToast(`«${t.name}» запущен на стене`); }}
                          className={`border px-2 py-1 font-mono text-[10px] uppercase transition-all active:scale-95 ${
                            isActive
                              ? "border-green/60 bg-green/10 text-green"
                              : "border-line text-mut hover:border-green/60 hover:text-green"
                          }`}
                        >
                          {isActive ? "в эфире" : "▶ стена"}
                        </button>
                        <button
                          onClick={() => {
                            const next = templates.filter((x) => x.id !== t.id);
                            setTemplates(next.length ? next : templates.slice(0, 1));
                            if (activeId === t.id && next.length) onActivate(next[0].id);
                            showToast(`шаблон «${t.name}» удалён`);
                          }}
                          className="border border-transparent p-1 text-dim transition-colors hover:border-red/50 hover:text-red"
                          title="удалить"
                        >
                          <Icon name="trash" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-line px-4 py-3">
                <button
                  onClick={() => setModal(true)}
                  className="flex w-full items-center justify-center gap-2 border border-cyan/60 bg-cyan/10 px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-cyan transition-all hover:bg-cyan hover:text-bg0 active:scale-95"
                >
                  <Icon name="cam" className="h-4 w-4" /> добавить камеру в реестр
                </button>
              </div>
            </div>
          </Reveal>

          {/* редактор */}
          <Reveal delay={120}>
            <div className="flex h-full min-h-[520px] flex-col border border-line bg-panel/70">
              {editing ? (
                <>
                  <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
                    <input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      placeholder="Название шаблона…"
                      className="w-64 border border-line bg-bg0 px-3 py-2 font-disp text-sm tracking-wide text-ink placeholder:text-dim focus:border-amber focus:outline-none"
                    />
                    <div className="flex-1" />
                    <button
                      onClick={() => setEditing(null)}
                      className="border border-line px-3 py-2 font-mono text-[11px] text-mut transition-colors hover:border-red/60 hover:text-red"
                    >
                      отмена
                    </button>
                    <button
                      onClick={save}
                      disabled={editing.name.trim().length < 2}
                      className="border border-amber/60 bg-amber/10 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-amber transition-all hover:bg-amber hover:text-bg0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      сохранить · {editing.camIds.length}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5">
                    <label className="flex items-center gap-2 font-mono text-[11px] text-dim">
                      сервер:
                      <select
                        value={serverSel}
                        onChange={(e) => setServerSel(Number(e.target.value))}
                        className="border border-line bg-bg0 px-2 py-1 font-mono text-[11px] text-ink focus:border-cyan focus:outline-none"
                      >
                        {SERVERS.map((s) => (
                          <option key={s.id} value={s.id}>С-{String(s.id).padStart(2, "0")} · {s.ip}</option>
                        ))}
                      </select>
                    </label>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="поиск камеры…"
                      className="w-44 border border-line bg-bg0 px-2.5 py-1.5 font-mono text-[11px] text-ink placeholder:text-dim focus:border-cyan focus:outline-none"
                    />
                    <span className="ml-auto font-mono text-[10px] text-dim">серверов в шаблоне: {serversInTpl}</span>
                  </div>

                  {/* лимит */}
                  <div className="border-b border-line px-4 py-2.5">
                    <Bar
                      value={editing.camIds.length}
                      max={MAX_TEMPLATE_CAMS}
                      label={`выбрано ${editing.camIds.length} / ${MAX_TEMPLATE_CAMS} камер`}
                      color="#3ddcf0"
                    />
                  </div>

                  <div className="grid flex-1 auto-rows-min grid-cols-1 gap-px overflow-y-auto bg-line/40 sm:grid-cols-2 xl:grid-cols-3" style={{ maxHeight: 430 }}>
                    {listCams.map((c) => {
                      const on = selectedSet.has(c.id);
                      const full = !on && editing.camIds.length >= MAX_TEMPLATE_CAMS;
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggle(c.id)}
                          disabled={full}
                          className={`flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                            on ? "bg-cyan/10" : "bg-panel hover:bg-bg0"
                          } ${full ? "cursor-not-allowed opacity-35" : ""}`}
                        >
                          <span
                            className={`grid h-4 w-4 shrink-0 place-items-center border transition-all ${
                              on ? "border-cyan bg-cyan text-bg0" : "border-line"
                            }`}
                          >
                            {on && <Icon name="check" className="h-3 w-3" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-mono text-[11px] text-ink">
                              <b className="text-amber">CAM-{c.num}</b> · {c.name}
                            </span>
                            <span className="block font-mono text-[9px] text-dim">
                              sub {c.subKbps} кбит/с · main {c.mainMbps.toFixed(1)} Мбит/с {c.ptz ? "· PTZ" : ""}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                    {listCams.length === 0 && (
                      <div className="col-span-full grid place-items-center bg-panel py-14 font-mono text-xs text-dim">
                        на сервере С-{String(serverSel).padStart(2, "0")} не найдено
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="grid flex-1 place-items-center p-10 text-center">
                  <div>
                    <div className="mx-auto mb-4 grid h-16 w-16 place-items-center border border-dashed border-cyan/40">
                      <Icon name="folder" className="h-7 w-7 text-cyan/60" />
                    </div>
                    <p className="font-disp text-lg uppercase tracking-wide text-mut">Выберите шаблон слева</p>
                    <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-dim">
                      Редактор позволяет набрать до {MAX_TEMPLATE_CAMS} камер с разных серверов: отметьте сервер,
                      отметьте камеры чекбоксами, сохраните — и шаблон сразу запустится на видеостене.
                    </p>
                    <div className="mt-5 flex justify-center gap-2">
                      <Chip tone="info">до {MAX_TEMPLATE_CAMS} камер</Chip>
                      <Chip tone="idle">любые из 70 серверов</Chip>
                      <Chip tone="ok">мгновенный запуск</Chip>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </div>

      {modal && (
        <AddCameraModal
          onClose={() => setModal(false)}
          onAdd={(cam) => {
            onAddCam(cam);
            setModal(false);
            showToast(`камера «${cam.name}» добавлена на Венера-С${String(cam.serverId).padStart(2, "0")}`);
          }}
        />
      )}

      {toast && (
        <div className="toast-in fixed bottom-6 right-6 z-[95] flex items-center gap-2.5 border border-green/50 bg-panel px-4 py-3 font-mono text-[12px] text-green shadow-[0_0_30px_rgba(61,220,151,0.2)]">
          <Icon name="check" className="h-4 w-4" />
          {toast}
        </div>
      )}
    </section>
  );
}
