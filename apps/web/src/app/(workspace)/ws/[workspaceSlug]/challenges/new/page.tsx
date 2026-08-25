'use client'

import { useParams } from 'next/navigation'
import { useTransition } from 'react'
import { WizardShell } from '@/components/challenge/wizard-shell'
import {
  Step1Foundation, Step2Outcome,   Step3Mode,
  Step4Schedule,   Step5Audience,  Step6Experience,
  Step7Communications, Step8Conversion, Step9Review,
} from '@/components/challenge/wizard-steps'
import { WizardProvider, useWizard } from './_context/wizard-context'
import { createChallengeAction } from '../actions'

const STEP_COMPONENTS = [
  Step1Foundation, Step2Outcome,   Step3Mode,
  Step4Schedule,   Step5Audience,  Step6Experience,
  Step7Communications, Step8Conversion, Step9Review,
]

function WizardInner() {
  const params = useParams<{ workspaceSlug: string }>()
  const { data } = useWizard()
  const [isPending, startTransition] = useTransition()

  function handlePublish() {
    startTransition(async () => {
      await createChallengeAction(params.workspaceSlug, {
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
        maxParticipants:  data.maxParticipants ? parseInt(data.maxParticipants) : null,
        requiresApproval: data.requiresApproval,
        settings: {
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
      })
    })
  }

  return (
    <WizardShell onPublish={handlePublish} isPublishing={isPending}>
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
