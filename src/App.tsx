import { useMemo, useState } from "react";
import {
  CAMS,
  DEFAULT_CALC,
  defaultTemplates,
  type CalcState,
  type Cam,
  type Template,
} from "./data";
import TopBar from "./components/TopBar";
import CameraWall from "./components/CameraWall";
import Servers from "./components/Servers";
import Templates from "./components/Templates";
import Architecture from "./components/Architecture";
import Calculator from "./components/Calculator";
import Archive from "./components/Archive";
import Stack from "./components/Stack";

export default function App() {
  /* реестр: базовые камеры + добавленные через окно авторизации */
  const [customCams, setCustomCams] = useState<Cam[]>([]);
  /* шаблоны видеостены */
  const [templates, setTemplates] = useState<Template[]>(() => defaultTemplates());
  const [activeId, setActiveId] = useState("tpl-svodka");
  /* калькулятор (общий с архивом) */
  const [calc, setCalc] = useState<CalcState>({ ...DEFAULT_CALC });

  const camById = useMemo(
    () => new Map<number, Cam>([...CAMS, ...customCams].map((c) => [c.id, c])),
    [customCams]
  );

  const handleAddCam = (partial: Omit<Cam, "id" | "num" | "hue" | "boxDelay" | "boxDur">) => {
    setCustomCams((prev) => [
      ...prev,
      {
        ...partial,
        id: 900_000 + prev.length + 1,
        num: String(121 + prev.length).padStart(3, "0"),
        hue: Math.floor(Math.random() * 360),
        boxDelay: Math.random() * 9,
        boxDur: 7 + Math.random() * 5,
      },
    ]);
  };

  return (
    <div className="relative min-h-screen">
      {/* фоновые слои */}
      <div className="grid-layer pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="noise-layer pointer-events-none fixed inset-0 z-0" aria-hidden />

      <div className="relative z-10">
        <TopBar />
        <main>
          <CameraWall
            camById={camById}
            templates={templates}
            activeId={activeId}
            onActivate={setActiveId}
          />
          <Servers customCams={customCams} />
          <Templates
            camById={camById}
            templates={templates}
            setTemplates={setTemplates}
            activeId={activeId}
            onActivate={setActiveId}
            customCams={customCams}
            onAddCam={handleAddCam}
          />
          <Architecture />
          <Calculator calc={calc} setCalc={setCalc} />
          <Archive calc={calc} />
          <Stack />
        </main>
      </div>
    </div>
  );
}
