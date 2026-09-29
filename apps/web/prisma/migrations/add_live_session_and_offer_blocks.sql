-- Two more block types: a live session and a next-step offer, inside a day.
--
-- These were left out of the first pass on purpose. `LiveSession` and `Offer`
-- are first-class models here with their own screens, so putting them inside a
-- day looked like duplicating them. The design asked for them twice, which
-- settles it — but the shape matters, so: these blocks describe *where in the
-- day* a session or an offer appears. Where a block refers to an existing
-- LiveSession or Offer row it stores that id in its `data` payload rather than
-- copying the session's time or the offer's price, so there is still exactly
-- one place either of those is edited.
--
-- ALTER TYPE ... ADD VALUE is additive and cannot be undone by a DROP: removing
-- an enum value means rewriting the type. That is the reason for IF NOT EXISTS
-- and for running these as separate statements — a value added inside a
-- transaction cannot be used by anything else until that transaction commits.

ALTER TYPE "StepBlockType" ADD VALUE IF NOT EXISTS 'LIVE_SESSION';
ALTER TYPE "StepBlockType" ADD VALUE IF NOT EXISTS 'OFFER_CTA';
