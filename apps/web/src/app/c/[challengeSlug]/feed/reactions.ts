/**
 * The reactions a participant may leave.
 *
 * A separate module because a 'use server' file may only export async
 * functions — a constant exported from actions.ts fails the build.
 */
export const ALLOWED_EMOJI = ['👏', '🔥', '💡', '❤️', '🎉'] as const

export type Emoji = (typeof ALLOWED_EMOJI)[number]
