/**
 * Which of a day's required blocks are still undone.
 *
 * The builder has always let a creator mark a block "Required", and the flag
 * has always been saved — and nothing read it. A participant could open a day
 * with a required assignment, write nothing, press Complete and collect the
 * day and its points. This is the one rule both sides now apply: the day page
 * uses it to hold the button and say what is left, and `completeStepAction`
 * uses it to refuse, because a button is not a gate.
 *
 * Only blocks a participant *does* something in can be required. A heading or
 * a video has no answer to check, so "required" on one means nothing, and the
 * builder no longer offers it there.
 */

/** Block types with an answer that can be checked. */
export const REQUIRABLE_TYPES = [
  'checklist', 'assignment', 'reflection', 'text_response', 'file_upload', 'discussion_prompt',
] as const

export type RequirableType = (typeof REQUIRABLE_TYPES)[number]

export function isRequirable(type: string): type is RequirableType {
  return (REQUIRABLE_TYPES as readonly string[]).includes(type.toLowerCase())
}

export interface RequirableBlock {
  id: string
  /** As stored (`ASSIGNMENT`) or as rendered (`assignment`) — both are accepted. */
  type: string
  data: unknown
}

/**
 * Whether a block must be done before the day can be completed.
 *
 * `required` lives in the block's JSON payload (there is no column), and is a
 * real boolean there. A string "true" from an older save counts too.
 */
export function isRequiredBlock(block: RequirableBlock): boolean {
  if (!isRequirable(block.type)) return false
  const d = block.data
  if (typeof d !== 'object' || d === null) return false
  const flag = (d as Record<string, unknown>).required
  return flag === true || flag === 'true'
}

/** The checklist's items, the same way the block itself splits them. */
function checklistItems(data: unknown): string[] {
  const raw = typeof data === 'object' && data !== null ? (data as Record<string, unknown>).items : ''
  return typeof raw === 'string' ? raw.split('\n').filter(Boolean) : []
}

const filled = (v: unknown) => typeof v === 'string' && v.trim().length > 0

/**
 * Whether one answer satisfies its block.
 *
 * `postedHere` is for a discussion prompt, whose answer is a feed post rather
 * than anything in the submission — and which the server must look up itself,
 * never take from the browser.
 */
export function isAnswered(block: RequirableBlock, answer: unknown, postedHere = false): boolean {
  switch (block.type.toLowerCase()) {
    case 'assignment':
    case 'text_response':
      return filled(answer)
    case 'reflection':
      return typeof answer === 'object' && answer !== null && filled((answer as Record<string, unknown>).text)
    case 'file_upload':
      return typeof answer === 'object' && answer !== null && filled((answer as Record<string, unknown>).key)
    case 'checklist': {
      // Every item ticked. A required checklist half-done is not done.
      const items = checklistItems(block.data)
      if (items.length === 0) return true
      const ticked = new Set(Array.isArray(answer) ? answer.filter((x) => typeof x === 'string') : [])
      return items.every((item) => ticked.has(item))
    }
    case 'discussion_prompt':
      return postedHere
    default:
      return true
  }
}

/** What a participant would call each block, for "still to do: …". */
export function blockLabel(block: RequirableBlock): string {
  const d = (typeof block.data === 'object' && block.data !== null ? block.data : {}) as Record<string, unknown>
  const titled = typeof d.title === 'string' && d.title.trim() ? d.title.trim() : null
  switch (block.type.toLowerCase()) {
    case 'assignment':        return titled ?? 'the assignment'
    case 'reflection':        return 'the reflection'
    case 'text_response':     return 'your written answer'
    case 'file_upload':       return 'the file upload'
    case 'checklist':         return 'every item on the checklist'
    case 'discussion_prompt': return 'a post in the discussion'
    default:                  return 'a required step'
  }
}

/**
 * The required blocks not yet satisfied, in page order.
 *
 * `answers` is the submission payload: each block's answer under its id.
 */
export function missingRequired(
  blocks: readonly RequirableBlock[],
  answers: Record<string, unknown>,
  postedHere = false
): RequirableBlock[] {
  return blocks.filter((b) => isRequiredBlock(b) && !isAnswered(b, answers[b.id], postedHere))
}

/** "Finish the assignment and the reflection first." */
export function missingMessage(missing: readonly RequirableBlock[]): string {
  const labels = missing.map(blockLabel)
  if (labels.length === 0) return ''
  const list = labels.length === 1
    ? labels[0]
    : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
  return `Finish ${list} first.`
}
