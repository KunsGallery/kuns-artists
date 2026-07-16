"use client";

type PublicArInstructionsProps = {
  viewport: "mobile" | "desktop";
};

type Step = {
  title: string;
  description: string;
};

function StepItem({
  index,
  step,
}: {
  index: number;
  step: Step;
}) {
  return (
    <li className="flex gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#F37021]/25 bg-[#F37021]/10 text-[10px] font-medium text-[#FFB37B]">
        {index}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-6 text-[#F7F1E8]">
          {step.title}
        </p>
        <p className="mt-1 text-sm leading-6 text-white/64">{step.description}</p>
      </div>
    </li>
  );
}

export function PublicArInstructions({ viewport }: PublicArInstructionsProps) {
  const steps: Step[] =
    viewport === "desktop"
      ? [
          {
            title: "작품과 3D 모형을 확인합니다.",
            description: "화면 왼쪽에서 작품 정보를 보고, 모델로 비율과 형태를 살펴보세요.",
          },
          {
            title: "오른쪽 QR 코드를 휴대폰으로 스캔합니다.",
            description: "같은 AR 페이지가 모바일에서 열리면 실제 공간 배치를 이어갈 수 있습니다.",
          },
        ]
      : [
          {
            title: "작품과 3D 모형을 먼저 확인합니다.",
            description: "모형이 작품의 실제 비율과 방향을 담고 있는지 살펴보세요.",
          },
          {
            title: "내 공간에 놓아보기를 누릅니다.",
            description: "배치가 시작되면 벽 높이를 맞춘 뒤 화면 안내에 따라 조정합니다.",
          },
          {
            title: "아래에서 작품 상세와 작가 소개를 이어서 봅니다.",
            description: "필요하면 도슨트 안내도 함께 확인할 수 있습니다.",
          },
        ];

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.038),rgba(255,255,255,0.016)),#161616] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.22)] md:p-6">
      <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
        {viewport === "desktop" ? "데스크톱 안내" : "모바일 안내"}
      </p>

      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#F7F1E8]">
        {viewport === "desktop"
          ? "휴대폰으로 이어서 볼 수 있게 준비합니다."
          : "작품을 보고, 바로 AR로 이어갑니다."}
      </h2>

      <ol className="mt-5 grid gap-3">
        {steps.map((step, index) => (
          <StepItem key={step.title} index={index + 1} step={step} />
        ))}
      </ol>
    </section>
  );
}
