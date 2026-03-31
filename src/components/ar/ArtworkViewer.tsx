type ArtworkViewerProps = {
  title: string;
  artistName: string;
  coverImage?: string;
  description?: string;
  medium?: string;
  dimensions?: string;
  year?: string;
};

export default function ArtworkViewer({
  title,
  artistName,
  coverImage,
  description,
  medium,
  dimensions,
  year,
}: ArtworkViewerProps) {
  return (
    <section className="rounded-[1.75rem] border border-black/8 bg-white p-5 md:p-6">
      <div className="overflow-hidden rounded-[1.35rem] border border-black/8 bg-[#f7f6f2]">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="h-[320px] w-full object-cover md:h-[520px]"
          />
        ) : (
          <div className="flex h-[320px] w-full items-center justify-center bg-gradient-to-br from-[#f3f1eb] to-[#faf8f4] md:h-[520px]">
            <div className="px-6 text-center">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-400">
                Preview
              </p>
              <h2 className="mt-4 text-3xl font-medium tracking-[-0.03em] text-neutral-950">
                {title}
              </h2>
              <p className="mt-3 text-sm text-neutral-500">{artistName}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
            Artwork Preview
          </p>
          <h2 className="mt-3 text-[1.8rem] font-medium tracking-[-0.03em] text-neutral-950 md:text-[2.1rem]">
            {title}
          </h2>
          <p className="mt-2 text-sm text-neutral-500">{artistName}</p>
        </div>

        <div className="space-y-1 text-sm text-neutral-600 md:text-right">
          {year ? <p>Year · {year}</p> : null}
          {medium ? <p>Medium · {medium}</p> : null}
          {dimensions ? <p>Size · {dimensions}</p> : null}
        </div>
      </div>

      {description ? (
        <p className="mt-5 text-sm leading-7 text-neutral-600">{description}</p>
      ) : null}
    </section>
  );
}