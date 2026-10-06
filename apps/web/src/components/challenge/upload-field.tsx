'use client'

/**
 * Pick a file, upload it, and put the resulting URL into whatever field asked.
 *
 * It sits beside a URL input rather than replacing it. Both routes are real:
 * an image already hosted somewhere only needs its address, and asking someone
 * to download and re-upload it would be rude. The upload is for the common
 * case of a file sitting on a desk.
 *
 * The workspace slug comes from the route, because the upload is
 * permission-checked against that workspace on the server.
 */

import { useRef, useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import { Upload, Loader2, Check } from 'lucide-react'
import { uploadWorkspaceFileAction } from '@/app/(workspace)/ws/[workspaceSlug]/upload-actions'

interface Props {
  kind?: 'image' | 'file'
  /** Called with the stored file's public URL. */
  onUploaded: (url: string, filename: string) => void
  label?: string
}

export function UploadField({ kind = 'image', onUploaded, label }: Props) {
  const params = useParams<{ workspaceSlug?: string }>()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isUploading, startUploading] = useTransition()

  const workspaceSlug = params?.workspaceSlug

  function handleFile(file: File) {
    if (!workspaceSlug) {
      setError('Uploads are only available inside a workspace.')
      return
    }

    setError(null)
    setDone(false)

    startUploading(async () => {
      try {
        const data = new FormData()
        data.set('file', file)
        const result = await uploadWorkspaceFileAction(workspaceSlug, data, kind)

        if (result.error || !result.url) {
          setError(result.error ?? 'The upload did not complete.')
          return
        }
        onUploaded(result.url, file.name)
        setDone(true)
      } catch (error) {
        // The action returns its own failures, but it can also reject outright
        // — `requireUser` and `requirePermission` throw, and so does a dropped
        // connection. An uncaught rejection inside a transition reaches the
        // error boundary and replaces the whole builder, which is how a failed
        // upload managed to take the page down with it.
        setError(
          error instanceof Error && error.message
            ? `The upload failed: ${error.message}`
            : 'The upload failed.'
        )
      }
    })
  }

  const accept = kind === 'image' ? 'image/png,image/jpeg,image/webp,image/gif' : undefined

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          // Cleared so picking the same file twice still fires a change.
          e.target.value = ''
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-3 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-60"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Uploading…
          </>
        ) : done ? (
          <>
            <Check className="h-4 w-4 text-green-600" aria-hidden="true" /> Uploaded — replace
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {label ?? (kind === 'image' ? 'Upload an image' : 'Upload a file')}
          </>
        )}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
