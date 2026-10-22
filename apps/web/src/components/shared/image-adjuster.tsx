'use client'

/**
 * Frame a picture before it is uploaded: drag to move, zoom to fill.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * A photo taken on a phone is 4032×3024 and whatever the camera was pointed
 * at. The places it lands here are not that shape: an avatar is a circle, a
 * cover is a wide banner. Without a step in between, the browser crops to the
 * centre, which puts the top of somebody's head outside the circle and the
 * subject of a cover photo behind the title. Letting the person say which part
 * matters is the whole feature.
 *
 * ── Why no cropping library ─────────────────────────────────────────────────
 *
 * The maths is a dozen lines and a dependency would need approval. Pan is a
 * pointer delta; zoom is one number; the export is a single `drawImage` with a
 * source rectangle. The hard parts of a cropper — touch gestures, rotation,
 * EXIF orientation — are either handled by the browser (`createImageBitmap`
 * applies EXIF rotation) or deliberately out of scope.
 *
 * ── What it returns ─────────────────────────────────────────────────────────
 *
 * A new File, not the one that went in: the caller uploads the framed version,
 * so what is stored is what was seen. The original is never sent anywhere,
 * which also means a 12-megapixel photo becomes a few hundred kilobytes.
 *
 * Animated GIFs are the one exception — drawing a frame to a canvas keeps one
 * frame and loses the animation — so callers skip this dialog for them.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, ZoomIn, ZoomOut, Move, RotateCcw } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** The frame's longest side on screen. The output is computed from this. */
const FRAME_W = 360
const MAX_ZOOM = 4

export interface AdjustTarget {
  /** Width ÷ height of the frame, or 'source' to keep the picture's own shape. */
  aspect: number | 'source'
  /** A circle mask for avatars; the crop itself is still rectangular. */
  shape?: 'circle' | 'rect'
  /** Longest side of the exported image, in pixels. */
  outputWidth?: number
}

interface Props {
  file: File | null
  target: AdjustTarget
  onCancel: () => void
  /** The framed picture, ready to upload. */
  onConfirm: (file: File) => void
}

interface Loaded {
  bitmap: ImageBitmap
  width: number
  height: number
  url: string
}

export function ImageAdjuster({ file, target, onCancel, onConfirm }: Props) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isExporting, setIsExporting] = useState(false)

  const frameRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!file) {
      setLoaded(null)
      return
    }

    let cancelled = false
    let objectUrl: string | null = null

    setError(null)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    ;(async () => {
      try {
        // `createImageBitmap` applies the EXIF rotation a phone writes, so a
        // portrait photo is not sideways in the frame and then sideways again
        // in the export.
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
        if (cancelled) {
          bitmap.close()
          return
        }
        objectUrl = URL.createObjectURL(file)
        setLoaded({ bitmap, width: bitmap.width, height: bitmap.height, url: objectUrl })
      } catch {
        if (!cancelled) setError('That image could not be read.')
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [file])

  // Releasing the bitmap matters: it is decoded pixels, and a few phone photos
  // left behind is tens of megabytes the tab never gets back.
  useEffect(() => () => { loaded?.bitmap.close() }, [loaded])

  // ── Geometry ──────────────────────────────────────────────────────────────

  const aspect = target.aspect === 'source'
    ? (loaded ? loaded.width / loaded.height : 1)
    : target.aspect

  const frameW = FRAME_W
  const frameH = Math.round(FRAME_W / aspect)

  // At zoom 1 the picture exactly covers the frame — never less, or there
  // would be empty space inside the crop.
  const baseScale = loaded
    ? Math.max(frameW / loaded.width, frameH / loaded.height)
    : 1
  const scale = baseScale * zoom
  const drawW = loaded ? loaded.width * scale : 0
  const drawH = loaded ? loaded.height * scale : 0

  /** How far the picture may move before an edge would come inside the frame. */
  const limit = {
    x: Math.max(0, (drawW - frameW) / 2),
    y: Math.max(0, (drawH - frameH) / 2),
  }

  const clamp = useCallback(
    (next: { x: number; y: number }) => ({
      x: Math.min(limit.x, Math.max(-limit.x, next.x)),
      y: Math.min(limit.y, Math.max(-limit.y, next.y)),
    }),
    [limit.x, limit.y]
  )

  // Zooming out can leave the picture outside its own limits, which would show
  // a sliver of background along one edge.
  useEffect(() => { setOffset((o) => clamp(o)) }, [clamp])

  // ── Pointer ───────────────────────────────────────────────────────────────

  function onPointerDown(e: React.PointerEvent) {
    if (!loaded) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    setOffset(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }))
  }

  function onPointerUp(e: React.PointerEvent) {
    drag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────

  async function confirm() {
    if (!loaded || !file) return
    setIsExporting(true)
    try {
      const outW = Math.min(target.outputWidth ?? 1024, Math.round(loaded.width * zoom))
      const outH = Math.round(outW / aspect)

      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no 2d context')

      // The slice of the original that the frame is showing. A point p in the
      // picture sits at (p - size/2) * scale + frame/2 + offset, so inverting
      // for the frame's top-left gives these.
      const sw = frameW / scale
      const sh = frameH / scale
      const sx = (loaded.width - sw) / 2 - offset.x / scale
      const sy = (loaded.height - sh) / 2 - offset.y / scale

      ctx.imageSmoothingQuality = 'high'
      // White underneath, because a transparent PNG exported as JPEG would
      // otherwise come out black.
      if (file.type !== 'image/png') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, outW, outH)
      }
      ctx.drawImage(loaded.bitmap, sx, sy, sw, sh, 0, 0, outW, outH)

      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, type, 0.9)
      )
      if (!blob) throw new Error('export failed')

      const ext = type === 'image/png' ? 'png' : 'jpg'
      const base = file.name.replace(/\.[^.]+$/, '') || 'image'
      onConfirm(new File([blob], `${base}.${ext}`, { type }))
    } catch {
      setError('The image could not be prepared. Try uploading it as it is.')
    } finally {
      setIsExporting(false)
    }
  }

  const circle = target.shape === 'circle'

  return (
    <Dialog open={file !== null} onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Adjust your image</DialogTitle>
          <DialogDescription>
            Drag to move it, zoom to fill the frame. What you see is what gets saved.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div
            ref={frameRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ width: frameW, height: frameH }}
            className={cn(
              'relative max-w-full touch-none select-none overflow-hidden bg-slate-100',
              circle ? 'rounded-full' : 'rounded-lg',
              loaded ? 'cursor-grab active:cursor-grabbing' : ''
            )}
          >
            {loaded ? (
              <>
                {/* The <img> is the preview; the export redraws from the
                    bitmap, so the two cannot disagree about what is framed. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={loaded.url}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute',
                    width: drawW,
                    height: drawH,
                    left: (frameW - drawW) / 2 + offset.x,
                    top: (frameH - drawH) / 2 + offset.y,
                    maxWidth: 'none',
                  }}
                />
                <div
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute inset-0 ring-1 ring-inset ring-slate-900/10',
                    circle ? 'rounded-full' : 'rounded-lg'
                  )}
                />
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                {error ?? <Loader2 className="h-5 w-5 animate-spin" />}
              </div>
            )}
          </div>

          <div className="flex w-full max-w-[360px] items-center gap-3">
            <ZoomOut className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              disabled={!loaded}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600"
            />
            <ZoomIn className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-slate-500"
              disabled={!loaded || (zoom === 1 && offset.x === 0 && offset.y === 0)}
              onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }) }}
            >
              <RotateCcw className="h-4 w-4" />
              <span className="sr-only">Reset</span>
            </Button>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Move className="h-3.5 w-3.5" aria-hidden="true" />
            Drag the image to choose what stays in frame
          </p>

          {error && loaded && (
            <p role="alert" className="text-xs font-medium text-red-600">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isExporting}>
            Cancel
          </Button>
          {/* Nobody is made to crop: the picture may already be the right
              shape, and forcing a decision on it would be the same mistake as
              deciding for them. */}
          <Button
            type="button"
            variant="outline"
            onClick={() => file && onConfirm(file)}
            disabled={isExporting}
          >
            Use original
          </Button>
          <Button type="button" onClick={confirm} disabled={!loaded || isExporting}>
            {isExporting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing…</>
            ) : (
              'Use this'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** GIFs lose their animation if redrawn, so they skip the adjuster. */
export function isAdjustable(file: File): boolean {
  return file.type !== 'image/gif'
}
