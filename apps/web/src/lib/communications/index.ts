// Communications — templates, trigger evaluation, delivery log, preferences
// (PRD §15, milestone 8).
//
//   catalogue.ts  the ten message types, which are essential, and the closed
//                 set of variables each may use
//   send.ts       evaluation and delivery, with "sent once", observable
//                 failures and workspace-scoped unsubscribe all enforced by
//                 the database
//
// Scheduled triggers (day available, starting soon, inactivity, session
// reminder, offer closing) are defined but not fired: they need a job runner,
// which is OD-04 and still an open owner decision. Nothing pretends otherwise
// — the creator UI marks them.

export {
  MESSAGES, messageFor, isEssential, render,
  type Trigger, type Firing, type MessageDefinition,
} from './catalogue'

export {
  dispatch, isUnsubscribed, setUnsubscribed,
  type DispatchInput, type DispatchResult, type DispatchStatus,
} from './send'
