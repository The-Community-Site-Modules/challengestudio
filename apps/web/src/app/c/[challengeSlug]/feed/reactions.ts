/**
 * The reactions a participant may leave.
 *
 * A separate module because a 'use server' file may only export async
 * functions — a constant exported from actions.ts fails the build.
 */
export const ALLOWED_EMOJI = ['👏', '🔥', '💡', '❤️', '🎉'] as const

export type Emoji = (typeof ALLOWED_EMOJI)[number]

/**
 * What each reaction is called out loud.
 *
 * The emoji itself is aria-hidden in the UI, so without these a screen reader
 * announces the button as "button" and a keyboard user has no idea which one
 * they are on. axe reports it as button-name, and it was reporting it here.
 */
export const EMOJI_LABEL: Record<Emoji, string> = {
  '👏': 'Applause',
  '🔥': 'Fire',
  '💡': 'Bright idea',
  '❤️': 'Love',
  '🎉': 'Celebrate',
}
