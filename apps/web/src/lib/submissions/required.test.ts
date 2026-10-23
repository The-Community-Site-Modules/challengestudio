import { describe, it, expect } from 'vitest'
import {
  isRequirable, isRequiredBlock, isAnswered, missingRequired, missingMessage,
} from './required'

const block = (id: string, type: string, data: Record<string, unknown> = {}) => ({ id, type, data })

describe('which blocks can be required', () => {
  it('only the ones a participant does something in', () => {
    for (const t of ['checklist', 'ASSIGNMENT', 'reflection', 'text_response', 'file_upload', 'discussion_prompt']) {
      expect(isRequirable(t)).toBe(true)
    }
    for (const t of ['heading', 'video', 'image', 'download', 'live_session', 'offer_cta']) {
      expect(isRequirable(t)).toBe(false)
    }
  })

  it('ignores "required" on a block with nothing to check', () => {
    expect(isRequiredBlock(block('v', 'video', { required: true }))).toBe(false)
  })

  it('reads the flag from the payload, boolean or older string', () => {
    expect(isRequiredBlock(block('a', 'assignment', { required: true }))).toBe(true)
    expect(isRequiredBlock(block('a', 'assignment', { required: 'true' }))).toBe(true)
    expect(isRequiredBlock(block('a', 'assignment', { required: false }))).toBe(false)
    expect(isRequiredBlock(block('a', 'assignment', {}))).toBe(false)
  })
})

describe('what counts as done', () => {
  it('text answers must have something in them', () => {
    const a = block('a', 'assignment')
    expect(isAnswered(a, 'My big idea')).toBe(true)
    expect(isAnswered(a, '   ')).toBe(false)
    expect(isAnswered(a, undefined)).toBe(false)
  })

  it('a reflection needs text, whatever its privacy', () => {
    const r = block('r', 'reflection')
    expect(isAnswered(r, { text: 'Learned a lot', isPrivate: true })).toBe(true)
    expect(isAnswered(r, { text: '', isPrivate: false })).toBe(false)
  })

  it('a file upload needs a stored file', () => {
    const f = block('f', 'file_upload')
    expect(isAnswered(f, { key: 'ws/ch/p/123.pdf', filename: 'x.pdf' })).toBe(true)
    expect(isAnswered(f, { filename: 'x.pdf' })).toBe(false)
  })

  it('a checklist needs every item ticked', () => {
    const c = block('c', 'checklist', { items: 'One\nTwo\nThree' })
    expect(isAnswered(c, ['One', 'Two', 'Three'])).toBe(true)
    expect(isAnswered(c, ['One', 'Three'])).toBe(false)
    expect(isAnswered(c, 'One')).toBe(false)
  })

  it('a discussion needs a post, which only the caller can know', () => {
    const d = block('d', 'discussion_prompt')
    // Whatever the browser claims, the answer is the post.
    expect(isAnswered(d, { posted: true }, false)).toBe(false)
    expect(isAnswered(d, undefined, true)).toBe(true)
  })
})

describe('missingRequired', () => {
  const day = [
    block('h', 'heading', { required: true }),
    block('a', 'assignment', { required: true, title: 'Your big idea' }),
    block('r', 'reflection', { required: false }),
    block('c', 'checklist', { required: true, items: 'Watch\nWrite' }),
  ]

  it('lists the required blocks left, in page order, and nothing optional', () => {
    expect(missingRequired(day, {}).map((b) => b.id)).toEqual(['a', 'c'])
  })

  it('is empty once they are done', () => {
    expect(missingRequired(day, { a: 'An idea', c: ['Watch', 'Write'] })).toEqual([])
  })

  it('says what is left in words', () => {
    expect(missingMessage(missingRequired(day, {})))
      .toBe('Finish Your big idea and every item on the checklist first.')
    expect(missingMessage(missingRequired(day, { a: 'An idea' })))
      .toBe('Finish every item on the checklist first.')
  })
})
