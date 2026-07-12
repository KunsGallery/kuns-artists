"use client";

import type { ArtworkOrientation } from "@/lib/ar-v2";

type Props = {
  orientation: ArtworkOrientation;
  onChange: (orientation: ArtworkOrientation) => void;
};

export function ArtworkOrientationEditor({ orientation, onChange }: Props) {
  const rotate = (amount: 90 | -90 | 180) => {
    const next = (orientation.rotationDeg + amount + 360) % 360;
    onChange({ ...orientation, rotationDeg: next as ArtworkOrientation["rotationDeg"] });
  };

  return (
    <section className="arv2-control-section">
      <div className="arv2-section-heading">
        <div>
          <p className="arv2-kicker">Atlas-only transform</p>
          <h2>Artwork Orientation</h2>
        </div>
        <span className="arv2-value-chip">{orientation.rotationDeg}°</span>
      </div>
      <div className="arv2-button-grid arv2-button-grid-3">
        <button type="button" className="arv2-button arv2-button-quiet" onClick={() => rotate(-90)}>Rotate Left</button>
        <button type="button" className="arv2-button arv2-button-quiet" onClick={() => rotate(90)}>Rotate Right</button>
        <button type="button" className="arv2-button arv2-button-quiet" onClick={() => rotate(180)}>Rotate 180°</button>
      </div>
      <div className="arv2-toggle-row">
        <label className="arv2-toggle"><input type="checkbox" checked={orientation.flipX} onChange={(event) => onChange({ ...orientation, flipX: event.target.checked })} /><span>Flip Horizontal</span></label>
        <label className="arv2-toggle"><input type="checkbox" checked={orientation.flipY} onChange={(event) => onChange({ ...orientation, flipY: event.target.checked })} /><span>Flip Vertical</span></label>
      </div>
      <button type="button" className="arv2-text-button" onClick={() => onChange({ rotationDeg: 0, flipX: false, flipY: false })}>Reset orientation</button>
    </section>
  );
}
