"use client";

import type { ArtworkProductionMetadata } from "@/lib/ar-v2";

type Props = {
  metadata: ArtworkProductionMetadata;
  onChange: (metadata: ArtworkProductionMetadata) => void;
};

export function ArtworkMetadataEditor({ metadata, onChange }: Props) {
  const update = (field: keyof ArtworkProductionMetadata, value: string) => onChange({ ...metadata, [field]: value });

  return (
    <section className="arv2-panel" aria-labelledby="artwork-information-title">
      <p className="arv2-kicker">D / Artwork Information</p>
      <h2 id="artwork-information-title" className="arv2-panel-title">Artwork Information</h2>
      <div className="arv2-metadata-grid">
        <TextField label="Artwork Title" value={metadata.title} onChange={(value) => update("title", value)} required />
        <TextField label="Artist Name" value={metadata.artistName} onChange={(value) => update("artistName", value)} required />
        <TextField label="Year" value={metadata.year} onChange={(value) => update("year", value)} />
        <TextField label="Medium" value={metadata.medium} onChange={(value) => update("medium", value)} />
        <TextField label="Inventory Number" value={metadata.inventoryNumber ?? ""} onChange={(value) => update("inventoryNumber", value)} />
      </div>
      <p className="arv2-helper-text">Title and artist are required for Production Artwork. Other fields are optional.</p>
    </section>
  );
}

function TextField({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="arv2-field">
      <span>{label}{required ? " *" : ""}</span>
      <input type="text" value={value} required={required} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
