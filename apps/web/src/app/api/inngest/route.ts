// Inngest background job handler
// All async jobs (email triggers, unlock scheduling, inactivity nudges) go through here
// TODO: Wire up Inngest functions in Milestones 8-13

export { GET, POST, PUT } from '@/lib/inngest/handler'
