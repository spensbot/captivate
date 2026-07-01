import AppModal from '../overlays/AppModal'
import { LaserWizardBody, LaserWizardHint } from './laserUi'

type Props = {
  open: boolean
  onOpenWizard: () => void
  onDismiss: () => void
}

export default function LaserFirstRunPrompt({
  open,
  onOpenWizard,
  onDismiss,
}: Props) {
  return (
    <AppModal
      open={open}
      title="Set up your laser DAC"
      onClose={onDismiss}
      maxWidth="36rem"
      actions={[
        { label: 'Not now', onClick: onDismiss },
        { label: 'Open setup wizard', onClick: onOpenWizard },
      ]}
    >
      <LaserWizardBody>
        <p>
          Before sending ILDA output to your projector, connect your DAC (Helios
          USB, Ether Dream, etc.), choose analog or TTL color mode, set scan
          rate, and calibrate galvo alignment.
        </p>
        <ul>
          <li>Detect and connect your Helios or other ILDA hardware</li>
          <li>Configure scan rate and RGB analog/TTL output</li>
          <li>Run the built-in calibration test pattern</li>
          <li>Assign laser units to projection zones</li>
        </ul>
        <LaserWizardHint>
          You can reopen the setup wizard anytime from Output &amp; safety →
          Setup wizard.
        </LaserWizardHint>
      </LaserWizardBody>
    </AppModal>
  )
}
