/**
 * Reading a submission's payload.
 *
 * The day page posts one entry per block, keyed by block id: a text response
 * is a string, a checklist an array, and a reflection `{ text, isPrivate }`.
 *
 * Privacy used to be read from a top-level `isPrivate` key that no block ever
 * sends, so every reflection — private by default — was stored as visible.
 * And the reviewers' pages only printed top-level strings, so a reflection's
 * text was invisible even to someone allowed to read it. Both readers live
 * here now so the writer and the pages cannot disagree again.
 */

type Payload = Record<string, unknown>

function asRecord(value: unknown): Payload | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Payload)
    : null
}

/** True if the participant marked any part of this submission private. */
export function submissionIsPrivate(data: unknown): boolean {
  const d = asRecord(data)
  if (!d) return false
  if (d.isPrivate === true) return true
  return Object.values(d).some((v) => asRecord(v)?.isPrivate === true)
}

export interface SubmissionFile {
  key: string
  filename: string
}

/**
 * Files a participant uploaded, as the file block stored them:
 * `{ "<blockId>": { key, filename } }`. The key names an object in the private
 * bucket; it is turned into a short-lived link only on request, after a
 * permission check (see the submissions `file` route).
 */
export function submissionFiles(data: unknown): SubmissionFile[] {
  const d = asRecord(data)
  if (!d) return []
  return Object.values(d).flatMap((v) => {
    const f = asRecord(v)
    if (!f || typeof f.key !== 'string' || !f.key) return []
    return [{ key: f.key, filename: typeof f.filename === 'string' && f.filename ? f.filename : 'file' }]
  })
}

/**
 * The writing in a submission, for a reviewer. Blocks store their own shapes,
 * so this picks out the ones that carry text rather than dumping raw JSON.
 */
export function readableAnswer(data: unknown): string {
  const d = asRecord(data)
  if (!d) return ''

  if (typeof d.text === 'string') return d.text
  if (typeof d.answer === 'string') return d.answer

  // Whatever else is writing, in the order the blocks stored it.
  return Object.entries(d)
    .map(([key, v]) => {
      if (key === 'isPrivate') return ''
      if (typeof v === 'string') return v
      const nested = asRecord(v)
      return typeof nested?.text === 'string' ? nested.text : ''
    })
    .filter((s) => s.trim().length > 0)
    .join('\n\n')
}
