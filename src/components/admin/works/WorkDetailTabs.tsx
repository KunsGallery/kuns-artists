"use client";

export type WorkDetailTab = "review" | "publication" | "ar-v2" | "docent" | "legacy";

type WorkDetailTabsProps = {
  activeTab: WorkDetailTab;
  onChange: (tab: WorkDetailTab) => void;
  tabs: Array<{
    value: WorkDetailTab;
    label: string;
    badge: string;
    tone?: "neutral" | "green" | "amber" | "red";
  }>;
};

export function WorkDetailTabs({ activeTab, onChange, tabs }: WorkDetailTabsProps) {
  return (
    <div className="sticky top-4 z-20 rounded-[1.5rem] border border-black/8 bg-white/90 px-3 py-3 shadow-[0_14px_40px_rgba(15,15,15,0.08)] backdrop-blur">
      <div
        role="tablist"
        aria-label="Work detail tabs"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {tabs.map((tab) => {
          const active = tab.value === activeTab;
          const toneClass = {
            neutral: "border-black/10 bg-[#f7f6f2] text-neutral-700",
            green: "border-emerald-300/40 bg-emerald-500/20 text-white",
            amber: "border-amber-400/25 bg-amber-400/10 text-amber-900",
            red: "border-red-300 bg-red-50 text-red-700",
          }[tab.tone || "neutral"];

          return (
            <button
              key={tab.value}
              id={`work-tab-${tab.value}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`work-panel-${tab.value}`}
              onClick={() => onChange(tab.value)}
              className={`inline-flex min-w-max items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                active
                  ? "border-[#F37021]/35 bg-[#F37021]/10 text-[#b85d18]"
                  : "border-black/10 bg-white text-neutral-700 hover:border-black/20 hover:bg-[#faf9f5]"
              }`}
            >
              <span className="whitespace-nowrap">{tab.label}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] ${toneClass}`}>
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
