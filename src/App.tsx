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
            href="https://playshoptitans.com/spreadsheet"
            target="_blank"
            rel="noreferrer"
          >
            Source spreadsheet
          </a>
        </span>
        <details className="about-legal">
          <summary>About &amp; legal</summary>
          <div className="about-body">
            <p>
              A fan-made companion for <strong>Shop Titans</strong>. This site
              is{" "}
              <strong>
                not endorsed, sponsored, or commissioned by Kabam Games, Inc.
              </strong>{" "}
              Shop Titans and its assets are © Kabam Games, Inc. This is a free,
              non-commercial community project.
            </p>
            <p>
              <strong>License.</strong> This project's own source code and
              content are open source under the{" "}
              <a
                href="https://github.com/andrelin/shop-titans-companion/blob/main/LICENSE"
                target="_blank"
                rel="noreferrer"
              >
                MIT License
              </a>{" "}
              — free to use, modify and share, with no added restrictions of our
              own. The Shop Titans game data, Fan Kit assets and collab
              trademarks below are not ours to license and remain with their
              respective owners.
            </p>
            <p>
              <strong>Attribution.</strong> Game data is synced from the
              official{" "}
              <a
                href="https://playshoptitans.com/spreadsheet"
                target="_blank"
                rel="noreferrer"
              >
                Shop Titans data spreadsheet
              </a>{" "}
              (maintained by Kabam). Item, affinity and type icons (where shown)
              are{" "}
              <strong>Shop Titans Fan Kit</strong> assets by Kabam Games, Inc.
              Avatar: The Last Airbender™, Ghostbusters™ and Jumanji™ assets and
              names from Shop Titans collaborations are used under fair use for
              this community fan tool; all rights reserved to their respective
              owners.
            </p>
            <p>
              <strong>Privacy &amp; data collection.</strong> This site does not
              collect or track any data beyond what GitHub Pages logs. When you
              visit a GitHub Pages site your IP address is logged for security
              purposes, whether or not you are signed into GitHub — see the{" "}
              <a
                href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
                target="_blank"
                rel="noreferrer"
              >
                GitHub Privacy Statement
              </a>
              .
            </p>
          </div>
        </details>
      </footer>
    </div>
  );
}
