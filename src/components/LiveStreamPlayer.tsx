import { useState } from "react";

interface LiveStreamProps {
  /** Embeddable broadcast URL. Only use URLs from trusted, authorized providers. */
  streamUrl?: string;
  matchTitle: string;
}

export function LiveStreamPlayer({ streamUrl, matchTitle }: LiveStreamProps) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl" aria-label={`Live broadcast: ${matchTitle}`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500 animate-pulse" aria-hidden="true" />
          <span className="truncate font-mono text-xs font-bold uppercase text-slate-200">
            Live broadcast: {matchTitle}
          </span>
        </div>
        <span className="shrink-0 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] text-rose-400">
          LIVE STREAM
        </span>
      </div>

      <div className="relative flex aspect-video items-center justify-center bg-black">
        {streamUrl && !hasError ? (
          <>
            {!hasLoaded && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center" role="status">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" aria-hidden="true" />
                <p className="font-mono text-xs text-slate-400">Connecting to broadcast…</p>
              </div>
            )}
            <iframe
              src={streamUrl}
              title={`Live broadcast: ${matchTitle}`}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => setHasLoaded(true)}
              onError={() => setHasError(true)}
            />
          </>
        ) : (
          <div className="space-y-3 p-6 text-center" role="status">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-xl font-bold text-cyan-400" aria-hidden="true">
              ▶
            </div>
            <p className="font-mono text-xs text-slate-400">
              {hasError ? "The broadcast could not be loaded." : "Live stream is not configured for this match."}
            </p>
            <p className="font-mono text-[10px] text-slate-500">Connect an authorized broadcast URL to view live video.</p>
          </div>
        )}
      </div>
    </section>
  );
}
