'use client'

import { useParams } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { WizardShell } from '@/components/challenge/wizard-shell'
import {
  Step1Foundation, Step2Outcome,   Step3Mode,
  Step4Schedule,   Step5Audience,  Step6Experience,
  Step7Communications, Step8Conversion, Step9Review,
} from '@/components/challenge/wizard-steps'
import { WizardProvider, useWizard } from './_context/wizard-context'
import { BlueprintPanel } from './_components/blueprint-panel'
import { createChallengeAction } from '../actions'

const STEP_COMPONENTS = [
  Step1Foundation, Step2Outcome,   Step3Mode,
  Step4Schedule,   Step5Audience,  Step6Experience,
  Step7Communications, Step8Conversion, Step9Review,
]

function WizardInner() {
  const params = useParams<{ workspaceSlug: string }>()
  const { data, draftSavedAt, saveDraft, clearDraft } = useWizard()
  const [isPending, startTransition] = useTransition()

  function handlePublish() {
    startTransition(async () => {
      // The saved draft is only useful while the challenge does not exist.
      // Once it does, leaving it behind means the next visit to the wizard
      // reopens a finished challenge as if it were unfinished.
      //
      // But only once it does. If the create is refused or fails, the draft
      // goes straight back — it used to be gone for good, with no message,
      // because the result was never read.
      clearDraft()
      const result = await createChallengeAction(params.workspaceSlug, {
        title:            data.title,
        slug:             data.slug,
        description:      data.description,
        promise:          data.promise,
        outcome:          data.outcome,
        startingPoint:    data.startingPoint,
        successDefinition: data.successDefinition,
        mode:             data.mode,
        timezone:         data.timezone,
        startsAt:         data.startsAt,
        endsAt:           data.endsAt,
        registrationOpensAt:  data.registrationOpensAt,
        registrationClosesAt: data.registrationClosesAt,
        isPublic:         data.visibility === 'public',
        maxParticipants:  data.maxParticipants ? (parseInt(data.maxParticipants, 10) || null) : null,
        requiresApproval: data.requiresApproval,
        settings: {
          // No columns for these two, and `settings` is already the JSON bag
          // the rest of the wizard's non-schema answers land in.
          category:      data.category,
          hostName:      data.hostName,
          numDays:       data.numDays,
          features:      data.features,
          emailTriggers: data.emailTriggers,
          inactivityDays: data.inactivityDays,
          offer: {
            enabled:  data.hasOffer,
            headline: data.offerHeadline,
            ctaText:  data.offerCtaText,
            url:      data.offerUrl,
            deadline: data.offerDeadline,
            bonuses:  data.offerBonuses,
          },
        },
      }).catch((error: unknown) => {
        saveDraft()
        throw error
      })
      // Success redirects to the builder; a result means it was refused.
      if (result && 'error' in result) {
        saveDraft()
        toast.error(result.error)
      }
    })
  }

  return (
    <WizardShell
      exitHref={`/ws/${params.workspaceSlug}/challenges`}
      sidebar={<BlueprintPanel />}
      draftSavedAt={draftSavedAt}
      onSaveDraft={saveDraft}
      onPublish={handlePublish}
      isPublishing={isPending}
    >
      {(step, setStep) => {
        const StepComponent = STEP_COMPONENTS[step - 1]
        return StepComponent
          ? <StepComponent step={step} setStep={setStep} />
          : null
      }}
    </WizardShell>
  )
}

export default function NewChallengePage() {
  return (
    <WizardProvider>
      <WizardInner />
    </WizardProvider>
  )
}
