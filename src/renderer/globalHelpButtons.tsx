import SectionHelpButton, {
  HelpIntro,
  HelpList,
  HelpTitle,
} from './base/SectionHelpPopover'

export function MixerHelpButton() {
  return (
    <SectionHelpButton ariaLabel="How the mixer works">
      <HelpTitle>How the mixer works</HelpTitle>
      <HelpIntro>
        Live view of what each light channel is sending. Drag a channel to override
        the show temporarily — useful for testing fixtures or quick fixes during a
        performance.
      </HelpIntro>
      <HelpList>
        <li>
          Use universe arrows to step through universes. Toggle{' '}
          <strong>All channels</strong> to show every slot or only channels used by
          patched fixtures.
        </li>
        <li>
          Overrides apply only while you hold or leave a manual value.{' '}
          <strong>Reset Overwrites</strong> clears all overrides on the active universe.
        </li>
        <li>Channel colors match fixture assignments from patching.</li>
      </HelpList>
    </SectionHelpButton>
  )
}
