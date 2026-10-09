/**
 * Turn a stored file's address into one the browser will save rather than open.
 *
 * ── Why the `download` attribute is not enough ──────────────────────────────
 *
 * `<a download>` is ignored on a cross-origin link. These files live on
 * Supabase Storage, which is a different origin from the app, so the attribute
 * does nothing and the browser falls back to what it does with any URL: images
 * and PDFs render in a tab, which is exactly the bug this fixes.
 *
 * The only thing that decides it is the response header, and Supabase sets
 * `Content-Disposition: attachment` when the object URL carries `?download`.
 * Passing a name after it is what the saved file gets called — without it the
 * browser uses the storage key, which is a timestamp and eight random
 * characters.
 *
 * Deliberately kept free of imports so it can be used from client components:
 * everything else in `lib/storage` runs on the service-role key and must never
 * reach a browser.
 */

/** Addresses this app stores files at. Anything else is somebody else's host. */
const SUPABASE_OBJECT_PATH = '/storage/v1/object/'

export function downloadUrl(url: string, filename?: string): string {
  if (!url) return url

  // A link the creator pasted to a file on someone else's server: we cannot
  // set headers there, so it is returned untouched and behaves as that host
  // decides. Rewriting it would only break the link.
  if (!url.includes(SUPABASE_OBJECT_PATH)) return url

  const separator = url.includes('?') ? '&' : '?'
  return filename
    ? `${url}${separator}download=${encodeURIComponent(filename)}`
    : `${url}${separator}download`
}
