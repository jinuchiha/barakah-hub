'use client';
/**
 * AvatarUpload — modern drag-and-drop avatar uploader for the web.
 *
 * Drag a photo or click to browse. Shows an upload progress ring, preview,
 * and animated success tick. Calls /api/members/avatar (Vercel Blob).
 */
import { useCallback, useRef, useState } from 'react';
import { ini } from '@/lib/utils';

interface Props {
  name: string;
  color: string;
  photoUrl: string | null;
  onUploaded: (url: string) => void;
}

export function AvatarUpload({ name, color, photoUrl, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const upload = useCallback(async (file: File) => {
    if (file.size > 2 * 1024 * 1024) { setError('File too large (max 2 MB)'); return; }
    if (!file.type.startsWith('image/')) { setError('Images only (jpg/png/webp)'); return; }
    setError(null);
    setUploading(true);
    setProgress(0);
    setPreview(URL.createObjectURL(file));

    // Fake progress animation while uploading (XHR could give real progress but
    // fetch is cleaner — simulate a smooth ramp to 85% then jump on success).
    let p = 0;
    const tick = setInterval(() => {
      p = Math.min(p + 8, 85);
      setProgress(p);
    }, 120);

    try {
      const body = new FormData();
      body.append('avatar', file);
      const res = await fetch('/api/members/avatar', { method: 'POST', body });
      const data = await res.json();
      clearInterval(tick);
      if (!res.ok) throw new Error(data?.error ?? 'Upload failed');
      setProgress(100);
      onUploaded(data.url);
      setTimeout(() => { setProgress(0); setUploading(false); }, 800);
    } catch (e) {
      clearInterval(tick);
      setProgress(0);
      setUploading(false);
      setPreview(null);
      setError(e instanceof Error ? e.message : 'Upload failed');
    }
  }, [onUploaded]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }, [upload]);

  const shown = preview ?? photoUrl;
  const circumference = 2 * Math.PI * 30; // r=30

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={[
          'relative cursor-pointer select-none transition-all duration-200',
          dragging ? 'scale-105' : 'hover:scale-[1.02]',
        ].join(' ')}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        aria-label="Upload avatar"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        {/* Avatar circle */}
        <div
          className="grid size-20 place-items-center overflow-hidden rounded-full text-2xl font-bold text-white shadow-[0_0_24px_rgba(0,0,0,0.4)]"
          style={{ background: shown ? undefined : color }}
        >
          {shown
            ? <img src={shown} alt="" className="size-full object-cover" />
            : ini(name)}
        </div>

        {/* Progress ring (SVG overlay) */}
        {uploading && (
          <svg
            className="absolute inset-0"
            width={80}
            height={80}
            viewBox="0 0 80 80"
            aria-hidden
          >
            <circle cx={40} cy={40} r={30} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={4} />
            <circle
              cx={40}
              cy={40}
              r={30}
              fill="none"
              stroke="#c89b3c"
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (progress / 100) * circumference}
              transform="rotate(-90 40 40)"
              style={{ transition: 'stroke-dashoffset 0.12s ease' }}
            />
          </svg>
        )}

        {/* Drag overlay */}
        {dragging && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <span className="text-2xl">☁</span>
          </div>
        )}

        {/* Success tick */}
        {progress === 100 && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <span className="text-2xl text-[#c89b3c]">✓</span>
          </div>
        )}

        {/* Camera badge */}
        {!uploading && (
          <div className="absolute -bottom-0.5 -right-0.5 grid size-7 place-items-center rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-gold)] shadow-md">
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-ink)]">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />

      {/* Status text */}
      {uploading && (
        <p className="text-[11px] text-[var(--color-gold-4)] animate-pulse">
          Uploading… {Math.round(progress)}%
        </p>
      )}
      {error && (
        <p className="text-[11px] text-red-400">{error}</p>
      )}
      {!uploading && !error && (
        <p className="text-[10px] text-[var(--txt-4)]">Drag & drop or click · max 2 MB</p>
      )}
    </div>
  );
}
