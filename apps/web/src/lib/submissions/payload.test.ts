/**
 * The day page posts one entry per block, keyed by block id. A reflection's
 * privacy flag is nested inside its own entry, which the writer used to miss —
 * so private reflections were stored as visible.
 */
import { describe, it, expect } from 'vitest'
import { readableAnswer, submissionFiles, submissionIsPrivate } from './payload'

describe('submissionIsPrivate', () => {
  it('finds a private reflection nested under its block id', () => {
    expect(submissionIsPrivate({ blk1: { text: 'my fears', isPrivate: true } })).toBe(true)
  })

  it('treats a reflection the participant made visible as not private', () => {
    expect(submissionIsPrivate({ blk1: { text: 'shared', isPrivate: false } })).toBe(false)
  })

  it('is private if any one block is', () => {
    expect(submissionIsPrivate({
      a: 'a plain answer',
      b: { text: 'private bit', isPrivate: true },
    })).toBe(true)
  })

  it('still honours a top-level flag', () => {
    expect(submissionIsPrivate({ isPrivate: true })).toBe(true)
  })

  it.each([null, undefined, 'text', 3, [], ['x']])('is false for %s', (value) => {
    expect(submissionIsPrivate(value)).toBe(false)
  })
})

describe('readableAnswer', () => {
  it('shows a reflection’s text, which used to be dropped', () => {
    expect(readableAnswer({ blk1: { text: 'what I learned', isPrivate: true } })).toBe('what I learned')
  })

  it('joins several answers in order and skips empty ones', () => {
    expect(readableAnswer({ a: 'first', b: '', c: { text: 'second' }, d: ['x'] })).toBe('first\n\nsecond')
  })

  it('prefers a top-level text or answer', () => {
    expect(readableAnswer({ text: 'whole', a: 'ignored' })).toBe('whole')
    expect(readableAnswer({ answer: 'whole' })).toBe('whole')
  })

  it('never prints the privacy flag', () => {
    expect(readableAnswer({ isPrivate: 'true' })).toBe('')
  })
})

describe('submissionFiles', () => {
  it('lists uploads stored by the file block', () => {
    expect(submissionFiles({
      a: 'text answer',
      b: { key: 'ws/ch/p/x.pdf', filename: 'plan.pdf' },
      c: { text: 'reflection', isPrivate: true },
    })).toEqual([{ key: 'ws/ch/p/x.pdf', filename: 'plan.pdf' }])
  })

  it('names a file with no filename rather than dropping it', () => {
    expect(submissionFiles({ b: { key: 'k' } })).toEqual([{ key: 'k', filename: 'file' }])
  })

  it.each([null, 'x', { a: { key: '' } }, { a: { key: 3 } }])('finds nothing in %j', (value) => {
    expect(submissionFiles(value)).toEqual([])
  })
})
