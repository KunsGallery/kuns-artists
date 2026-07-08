"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

type DocentAudioPlayerProps = {
  title?: string;
  description?: string;
  src: string;
};

export default function DocentAudioPlayer({
  title,
  description,
  src,
}: DocentAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  const progress = useMemo(() => {
    if (!duration) {
      return 0;
    }

    return Math.min(100, Math.max(0, (currentTime / duration) * 100));
  }, [currentTime, duration]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
  }, [src]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  async function handleTogglePlayback() {
    const audio = audioRef.current;

    if (!audio || hasError) {
      return;
    }

    try {
      if (audio.paused) {
        await audio.play();
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    } catch {
      setHasError(true);
      setIsPlaying(false);
    }
  }

  function handleSeek(value: string) {
    const audio = audioRef.current;
    const nextTime = Number(value);

    if (!audio || !Number.isFinite(nextTime)) {
      return;
    }

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018)),#151515] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
            Docent Audio
          </p>
          <h3 className="mt-3 text-[1.25rem] font-medium tracking-[-0.04em] text-[#F7F1E8] md:text-[1.45rem]">
            {title || "Docent Audio Guide"}
          </h3>
        </div>

        <span className="inline-flex rounded-full border border-[#F37021]/25 bg-[#F37021]/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#ffad76]">
          Guide
        </span>
      </div>

      {description ? (
        <p className="mt-3 text-sm leading-7 text-white/60">{description}</p>
      ) : (
        <p className="mt-3 text-sm leading-7 text-white/54">
          도슨트 오디오 설명을 들을 수 있습니다.
        </p>
      )}

      <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-black/25 px-4 py-4">
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onLoadedMetadata={(event) => {
            setDuration(event.currentTarget.duration || 0);
            setHasError(false);
          }}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={() => {
            setHasError(true);
            setIsPlaying(false);
          }}
        />

        {hasError ? (
          <p className="text-sm leading-7 text-white/60">
            Audio guide is unavailable.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleTogglePlayback()}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#F37021]/35 bg-[#F37021]/10 text-[#F7F1E8] transition hover:border-[#F37021]/55 hover:bg-[#F37021]/16"
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
              >
                {isPlaying ? (
                  <span className="text-sm">❚❚</span>
                ) : (
                  <span className="ml-0.5 text-sm">▶</span>
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-[#F7F1E8]">
                    {title || "Docent Audio Guide"}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </p>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-[#F37021] transition-[width] duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={duration ? currentTime : 0}
              onChange={(event) => handleSeek(event.target.value)}
              className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#F37021]"
              aria-label="Seek audio"
              disabled={!duration}
            />
          </>
        )}
      </div>
    </section>
  );
}
