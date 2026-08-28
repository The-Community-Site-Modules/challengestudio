import { teardown } from './fixture'

/**
 * Always removes the fixture, including after a failed run — a leftover tenant
 * would make the next run's seed collide and every failure look like a
 * fixture problem.
 */
export default async function globalTeardown() {
  await teardown()
}
