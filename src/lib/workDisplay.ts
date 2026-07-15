type WorkWithDisplayOrder = {
  displayOrder?: number;
};

type WorkWithArAssets = {
  arV2Asset?: {
    status?: string;
    glbUrl?: string;
  };
  generatedGlbUrl?: string;
  modelGlb?: string;
  generatedUsdzUrl?: string;
  modelUsdz?: string;
};

function hasValidDisplayOrder(work: WorkWithDisplayOrder) {
  return Number.isFinite(work.displayOrder as number);
}

export function sortWorksForDisplay<T extends WorkWithDisplayOrder>(items: T[]) {
  return [...items]
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftHasOrder = hasValidDisplayOrder(left.item);
      const rightHasOrder = hasValidDisplayOrder(right.item);
      const leftOrder = left.item.displayOrder as number;
      const rightOrder = right.item.displayOrder as number;

      if (leftHasOrder !== rightHasOrder) {
        return leftHasOrder ? -1 : 1;
      }

      if (leftHasOrder && rightHasOrder && leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.index - right.index;
    })
    .map(({ item }) => item);
}

function getTrimmedUrl(value?: string) {
  const trimmed = value?.trim() ?? "";

  return trimmed || "";
}

export function getReadyArV2GlbUrl(work: WorkWithArAssets) {
  if (work.arV2Asset?.status !== "ready") {
    return "";
  }

  return getTrimmedUrl(work.arV2Asset.glbUrl);
}

export function getLegacyArGlbUrl(work: WorkWithArAssets) {
  return getTrimmedUrl(work.generatedGlbUrl) || getTrimmedUrl(work.modelGlb);
}

export function getLegacyArUsdzUrl(work: WorkWithArAssets) {
  return getTrimmedUrl(work.generatedUsdzUrl) || getTrimmedUrl(work.modelUsdz);
}

export function getArGlbUrl(work: WorkWithArAssets) {
  return getReadyArV2GlbUrl(work) || getLegacyArGlbUrl(work);
}

export function getArUsdzUrl(work: WorkWithArAssets) {
  return getLegacyArUsdzUrl(work);
}

export function hasReadyArV2Asset(work: WorkWithArAssets) {
  return Boolean(getReadyArV2GlbUrl(work));
}

export function hasLegacyArAsset(work: WorkWithArAssets) {
  return Boolean(getLegacyArGlbUrl(work) || getLegacyArUsdzUrl(work));
}

export function hasArAsset(work: WorkWithArAssets) {
  return Boolean(getArGlbUrl(work) || getArUsdzUrl(work));
}
