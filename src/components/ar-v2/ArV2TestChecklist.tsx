"use client";

import { useMemo, useState } from "react";

const CASES = ["Portrait Artwork", "Landscape Artwork", "Square Artwork"] as const;
const CHECKS = [
  "Desktop front correct",
  "Desktop back label correct",
  "Desktop side finish correct",
  "iPhone front correct",
  "iPhone back correct",
  "iPhone physical scale correct",
  "No tearing or transparency",
] as const;

type CaseName = typeof CASES[number];
type CheckName = typeof CHECKS[number];
type ChecklistState = Record<CaseName, Record<CheckName, boolean>>;

function createInitialState(): ChecklistState {
  return Object.fromEntries(CASES.map((caseName) => [caseName, Object.fromEntries(CHECKS.map((check) => [check, false]))])) as ChecklistState;
}

export function ArV2TestChecklist() {
  const [checked, setChecked] = useState<ChecklistState>(createInitialState);
  const verifiedCount = useMemo(() => CASES.filter((caseName) => CHECKS.every((check) => checked[caseName][check])).length, [checked]);
  const update = (caseName: CaseName, check: CheckName, value: boolean) => setChecked((current) => ({ ...current, [caseName]: { ...current[caseName], [check]: value } }));

  return (
    <section className="arv2-panel" aria-labelledby="checklist-title">
      <div className="arv2-section-heading">
        <div>
          <p className="arv2-kicker">I / Phase 2 QA record</p>
          <h2 id="checklist-title">Phase 2 Test Checklist</h2>
        </div>
        <span className="arv2-value-chip">{verifiedCount} / 3 VERIFIED</span>
      </div>
      <div className="arv2-checklist">
        {CASES.map((caseName) => {
          const verified = CHECKS.every((check) => checked[caseName][check]);
          return (
            <details className="arv2-checklist-case" key={caseName} open>
              <summary><span>{caseName}</span><span className={`arv2-status arv2-status-${verified ? "pass" : "—"}`}>{verified ? "VERIFIED" : "OPEN"}</span></summary>
              <div className="arv2-checklist-items">
                {CHECKS.map((check) => (
                  <label className="arv2-toggle" key={check}><input type="checkbox" checked={checked[caseName][check]} onChange={(event) => update(caseName, check, event.target.checked)} /><span>{check}</span></label>
                ))}
              </div>
            </details>
          );
        })}
      </div>
      <p className="arv2-helper-text">Checklist state is local to this page and does not affect model generation.</p>
    </section>
  );
}
