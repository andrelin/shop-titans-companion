import { useEffect, useMemo, useState } from "react";
import { loadCommittedData } from "./data/load";
import { checkLiveVersion } from "./data/freshness";
import type { GameData } from "./data/types";
import { DragonInvasion } from "./tools/DragonInvasion/DragonInvasion";

type ToolKey = "dragon";

const TOOLS: { key: ToolKey; label: string }[] = [
  { key: "dragon", label: "Dragon Invasion" },
];

export function App() {
  const data = useMemo<GameData>(() => loadCommittedData(), []);
  const [tool, setTool] = useState<ToolKey>("dragon");
  const [liveVersion, setLiveVersion] = useState<string | null>(null);

  // Reflect tool in the URL hash so links are shareable.
  useEffect(() => {
    const fromHash = window.location.hash.replace(/^#\/?/, "") as ToolKey;
    if (TOOLS.some((t) => t.key === fromHash)) setTool(fromHash);
    const onHash = () => {
      const h = window.location.hash.replace(/^#\/?/, "") as ToolKey;
      if (TOOLS.some((t) => t.key === h)) setTool(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Background check: is the upstream spreadsheet newer than our committed
  // copy? If so, show a small notice — full data is refreshed by the daily
  // GitHub Action.
  useEffect(() => {
    let cancelled = false;
    checkLiveVersion(data.meta.sourceSheetVersion).then((v) => {
      if (!cancelled) setLiveVersion(v);
    });
    return () => {
      cancelled = true;
    };
  }, [data.meta.sourceSheetVersion]);

  const selectTool = (k: ToolKey) => {
    window.location.hash = `#/${k}`;
    setTool(k);
  };

  return (
    <div className="layout">
      <header className="top">
        <h1>Shop Titans Companion</h1>
        <nav>
          {TOOLS.map((t) => (
            <button
              key={t.key}
              aria-current={tool === t.key ? "page" : undefined}
              onClick={() => selectTool(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {liveVersion ? (
          <div className="banner">
            Upstream spreadsheet is now <strong>{liveVersion}</strong>; this
            page is showing{" "}
            <strong>{data.meta.sourceSheetVersion ?? "an older snapshot"}</strong>
            . The scheduled sync will refresh within ~24h.
          </div>
        ) : null}
        {tool === "dragon" && <DragonInvasion data={data} />}
      </main>

      <footer>
        <span>
          Data synced {new Date(data.meta.syncedAt).toLocaleString()}{" "}
          {data.meta.sourceSheetVersion
            ? `· ${data.meta.sourceSheetVersion}`
            : null}{" "}
          · {data.meta.blueprintCount} blueprints
        </span>
        <span>
          <a
            href="https://docs.google.com/spreadsheets/d/1WLa7X8h3O0-aGKxeAlCL7bnN8-FhGd3t7pz2RCzSg8c"
            target="_blank"
            rel="noreferrer"
          >
            Source spreadsheet
          </a>
        </span>
      </footer>
    </div>
  );
}
