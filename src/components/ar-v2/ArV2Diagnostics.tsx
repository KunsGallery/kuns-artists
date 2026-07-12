"use client";

import type { ArV2Diagnostic } from "@/lib/ar-v2";

export function ArV2Diagnostics({ diagnostics }: { diagnostics: ArV2Diagnostic[] }) {
  const summary = diagnostics.some((item) => item.severity === "FAIL")
    ? "FAIL"
    : diagnostics.some((item) => item.severity === "WARNING")
      ? "WARNING"
      : diagnostics.length > 0
        ? "PASS"
        : "—";

  return (
    <section className="arv2-panel" aria-labelledby="diagnostics-title">
      <div className="arv2-section-heading">
        <div>
          <p className="arv2-kicker">Canonical model checks</p>
          <h2 id="diagnostics-title">Diagnostics</h2>
        </div>
        <span className={`arv2-status arv2-status-${summary.toLowerCase()}`}>{summary}</span>
      </div>
      {diagnostics.length === 0 ? (
        <p className="arv2-empty">No model has been built yet.</p>
      ) : (
        <div className="arv2-diagnostic-list">
          {diagnostics.map((item) => (
            <div className="arv2-diagnostic-row" key={`${item.code}-${item.detail}`}>
              <span className={`arv2-status arv2-status-${item.severity.toLowerCase()}`}>{item.severity}</span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
