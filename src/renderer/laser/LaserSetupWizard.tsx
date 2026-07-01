import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import WizardModal, { WizardStepDef } from '../overlays/WizardModal'
import type { LaserDacProfile } from '../../shared/laserFixtureRouting'
import { dacSessionId } from '../../shared/laserFixtureRouting'
import {
  createDefaultLaserDacHardwareSettings,
  normalizeLaserDacHardwareSettings,
} from '../../shared/laserHardwareSettings'
import {
  LASER_DAC_CONNECTION_PRESETS,
  dacPresetById,
  dacPresetFromProfile,
  type LaserDacConnectionPresetId,
} from './laserConnectionPresets'
import LaserHardwareSettingsFields from './LaserHardwareSettingsFields'
import LaserHeliosDeviceField from './LaserHeliosDeviceField'
import {
  defaultConnectionTargetForBackend,
  isHeliosAutoDiscoverTarget,
  pickHeliosDeviceTarget,
} from './laserHeliosConnection'
import {
  laserDacConnectRequest,
  laserDacDisconnectRequest,
  laserDacListDevicesRequest,
} from '../ipcHandler'
import {
  LaserFieldLabel,
  LaserPrimaryButton,
  LaserSelect,
  LaserTextInput,
  LaserWizardBody,
  LaserWizardHint,
  LaserWizardReviewRow,
} from './laserUi'

const STEPS: WizardStepDef[] = [
  {
    key: 'intro',
    title: 'Welcome',
    description:
      'Set up your ILDA laser DAC, scan rate, color mode, and galvo calibration before assigning fixtures to zones.',
  },
  {
    key: 'hardware',
    title: 'Hardware',
    description:
      'Name this DAC profile and choose how Captivate connects to your hardware.',
  },
  {
    key: 'connection',
    title: 'Connection',
    description:
      'Pick the Helios or other device to use. Test the connection before continuing.',
  },
  {
    key: 'output',
    title: 'Scan & color',
    description:
      'Set analog vs TTL color mode, scanner point rate, and global output power.',
  },
  {
    key: 'calibration',
    title: 'Calibration',
    description:
      'Adjust size, position, and rotation so the ILDA test pattern fits your projection area.',
  },
  {
    key: 'zones',
    title: 'Projection zones',
    description:
      'Lay out DAC scan regions and assign fixtures to zones in the dedicated zone editor.',
  },
  {
    key: 'review',
    title: 'Review',
    description: 'Confirm settings, then save to this DAC profile.',
  },
]

type Props = {
  open: boolean
  profile: LaserDacProfile
  onClose: () => void
  onSave: (profile: LaserDacProfile) => void
  onOpenZones?: () => void
  testPatternActive?: boolean
  onTestPatternActiveChange?: (active: boolean) => void
  testPatternOutputReady?: boolean
}

export default function LaserSetupWizard({
  open,
  profile,
  onClose,
  onSave,
  onOpenZones,
  testPatternActive = false,
  onTestPatternActiveChange,
  testPatternOutputReady = false,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [draft, setDraft] = useState<LaserDacProfile>(profile)
  const [connectStatus, setConnectStatus] = useState('')
  const [connectBusy, setConnectBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setStepIndex(0)
    const connectionTarget =
      profile.backend === 'helios' &&
      !isHeliosAutoDiscoverTarget(profile.connectionTarget) &&
      !/^\d+$/.test(profile.connectionTarget.trim())
        ? '0'
        : profile.connectionTarget
    setDraft({
      ...profile,
      connectionTarget,
      hardwareSettings: normalizeLaserDacHardwareSettings(profile.hardwareSettings),
    })
    setConnectStatus('')
  }, [open, profile])

  useEffect(() => {
    if (!open || stepIndex !== 4) return
    onTestPatternActiveChange?.(true)
  }, [open, stepIndex, onTestPatternActiveChange])

  const dacPreset = useMemo(() => dacPresetFromProfile(draft), [draft])

  const patchDraft = (patch: Partial<LaserDacProfile>) =>
    setDraft((prev) => ({ ...prev, ...patch }))

  const applyPreset = (presetId: LaserDacConnectionPresetId) => {
    const preset = dacPresetById(presetId)
    patchDraft({
      outputProtocol: preset.protocol,
      backend: preset.backend,
      connectionTarget: defaultConnectionTargetForBackend(preset.backend),
    })
  }

  const testConnect = async () => {
    setConnectBusy(true)
    setConnectStatus('Connecting…')
    const sid = dacSessionId(draft.id)
    try {
      let target = draft.connectionTarget
      if (draft.backend === 'helios') {
        const scan = await laserDacListDevicesRequest('helios')
        target = pickHeliosDeviceTarget(scan.devices, draft.connectionTarget)
        if (target !== draft.connectionTarget.trim()) {
          patchDraft({ connectionTarget: target })
        }
      }
      const result = await laserDacConnectRequest({
        protocol: draft.outputProtocol,
        backend: draft.backend,
        target,
        sessionId: sid,
      })
      if (result.ok) {
        setConnectStatus('Connected successfully.')
        await laserDacDisconnectRequest(sid)
      } else {
        setConnectStatus(result.message ?? 'Connection failed.')
      }
    } catch (e) {
      setConnectStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setConnectBusy(false)
    }
  }

  const handleClose = () => {
    setStepIndex(0)
    onTestPatternActiveChange?.(false)
    onClose()
  }

  const handleSave = () => {
    onTestPatternActiveChange?.(false)
    onSave({
      ...draft,
      hardwareSettings: normalizeLaserDacHardwareSettings(
        draft.hardwareSettings ?? createDefaultLaserDacHardwareSettings()
      ),
    })
    setStepIndex(0)
    onClose()
  }

  if (!open) return null

  return (
    <WizardModal
      open={open}
      title="Laser setup wizard"
      steps={STEPS}
      stepIndex={stepIndex}
      onClose={handleClose}
      onBack={() => setStepIndex((i) => Math.max(0, i - 1))}
      onNext={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
      onSave={handleSave}
      saveLabel="Save profile"
      maxWidth="min(46rem, calc(100vw - 2rem))"
      minHeight="min(34rem, calc(100dvh - 5rem))"
    >
      {stepIndex === 0 && (
        <LaserWizardBody>
          <p>
            This wizard configures one <strong>DAC profile</strong> — the ILDA
            device that drives your laser projector(s). You will set:
          </p>
          <ul>
            <li>Connection type (Helios USB, Ether Dream, etc.)</li>
            <li>Analog vs TTL color output for your RGB wiring</li>
            <li>Scanner point rate (pps) and output power</li>
            <li>Size, position, and rotation calibration</li>
            <li>Projection zones and fixture routing</li>
          </ul>
          <LaserWizardHint>
            After saving, use the safety arm button before live output.
          </LaserWizardHint>
        </LaserWizardBody>
      )}

      {stepIndex === 1 && (
        <StepBody>
          <LaserFieldLabel htmlFor="laser-wizard-profile-name">
            Profile name
          </LaserFieldLabel>
          <LaserTextInput
            id="laser-wizard-profile-name"
            value={draft.name}
            onChange={(e) => patchDraft({ name: e.target.value })}
            placeholder="Main DAC"
          />

          <LaserFieldLabel htmlFor="laser-wizard-connection-type">
            Connection type
          </LaserFieldLabel>
          <LaserSelect
            id="laser-wizard-connection-type"
            value={dacPreset.id}
            onChange={(e) =>
              applyPreset(e.target.value as LaserDacConnectionPresetId)
            }
          >
            {LASER_DAC_CONNECTION_PRESETS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </LaserSelect>
          <LaserWizardHint>{dacPreset.shortHint}</LaserWizardHint>
        </StepBody>
      )}

      {stepIndex === 2 && (
        <StepBody>
          {draft.backend === 'helios' ? (
            <LaserHeliosDeviceField
              connectionTarget={draft.connectionTarget}
              onConnectionTargetChange={(connectionTarget) =>
                patchDraft({ connectionTarget })
              }
            />
          ) : null}

          {dacPreset.showTarget && draft.backend !== 'helios' ? (
            <>
              <LaserFieldLabel>{dacPreset.targetLabel}</LaserFieldLabel>
              <LaserTextInput
                value={draft.connectionTarget}
                onChange={(e) =>
                  patchDraft({ connectionTarget: e.target.value })
                }
                placeholder={dacPreset.targetPlaceholder}
              />
              <LaserWizardHint>{dacPreset.targetTooltip}</LaserWizardHint>
            </>
          ) : null}

          <TestRow>
            <LaserPrimaryButton
              disabled={connectBusy}
              onClick={() => void testConnect()}
            >
              {connectBusy ? 'Testing…' : 'Test connection'}
            </LaserPrimaryButton>
            {connectStatus.length > 0 ? (
              <LaserWizardHint>{connectStatus}</LaserWizardHint>
            ) : null}
          </TestRow>
        </StepBody>
      )}

      {stepIndex === 3 && (
        <LaserHardwareSettingsFields
          settings={
            draft.hardwareSettings ?? createDefaultLaserDacHardwareSettings()
          }
          onChange={(hardwareSettings) => patchDraft({ hardwareSettings })}
          showCalibration={false}
        />
      )}

      {stepIndex === 4 && (
        <LaserHardwareSettingsFields
          settings={
            draft.hardwareSettings ?? createDefaultLaserDacHardwareSettings()
          }
          onChange={(hardwareSettings) => patchDraft({ hardwareSettings })}
          showCalibration
          testPatternActive={testPatternActive}
          onTestPatternActiveChange={onTestPatternActiveChange}
          testPatternOutputReady={testPatternOutputReady}
        />
      )}

      {stepIndex === 5 && (
        <LaserWizardBody>
          <p>
            Projection zones define where each scanner region maps on your DAC.
            Zone geometry is edited in a dedicated modal — not on the ILDA
            drawing canvas.
          </p>
          <LaserWizardReviewRow>
            <strong>Zones on this profile</strong>
            <span>{draft.zones.length}</span>
          </LaserWizardReviewRow>
          {onOpenZones ? (
            <LaserPrimaryButton type="button" onClick={onOpenZones}>
              Open projection zone editor…
            </LaserPrimaryButton>
          ) : null}
          <LaserWizardHint>
            Save the wizard when you are done, then assign laser units to zones
            in Laser Setup.
          </LaserWizardHint>
        </LaserWizardBody>
      )}

      {stepIndex === 6 && (
        <LaserWizardBody>
          <LaserWizardReviewRow>
            <strong>Profile</strong>
            <span>{draft.name}</span>
          </LaserWizardReviewRow>
          <LaserWizardReviewRow>
            <strong>Connection</strong>
            <span>{dacPreset.label}</span>
          </LaserWizardReviewRow>
          <LaserWizardReviewRow>
            <strong>Target</strong>
            <span>
              {draft.backend === 'helios'
                ? `Helios USB (device ${draft.connectionTarget.trim() || '0'})`
                : draft.connectionTarget.trim() || 'Auto discover'}
            </span>
          </LaserWizardReviewRow>
          <LaserWizardReviewRow>
            <strong>Color mode</strong>
            <span>
              {draft.hardwareSettings.colorMode === 'ttl' ? 'TTL' : 'Analog'}
            </span>
          </LaserWizardReviewRow>
          <LaserWizardReviewRow>
            <strong>Scan rate</strong>
            <span>{draft.hardwareSettings.scanRatePps.toLocaleString()} pps</span>
          </LaserWizardReviewRow>
          <LaserWizardReviewRow>
            <strong>Output power</strong>
            <span>{Math.round(draft.hardwareSettings.outputPower01 * 100)}%</span>
          </LaserWizardReviewRow>
          <LaserWizardReviewRow>
            <strong>Calibration</strong>
            <span>
              size {draft.hardwareSettings.calibration.masterSizePct}% (
              {draft.hardwareSettings.calibration.sizeXPct}% ×{' '}
              {draft.hardwareSettings.calibration.sizeYPct}%), rot{' '}
              {draft.hardwareSettings.calibration.rotationDeg.toFixed(1)}°
            </span>
          </LaserWizardReviewRow>
          <LaserWizardHint>
            Open Projection zones… in Laser Setup any time to adjust zone layout
            or fixture routing.
          </LaserWizardHint>
        </LaserWizardBody>
      )}
    </WizardModal>
  )
}

const StepBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`

const TestRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.35rem;
`
