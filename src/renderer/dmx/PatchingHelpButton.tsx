import SectionHelpButton, { HelpIntro, HelpList, HelpTitle } from './SectionHelpPopover'

export default function PatchingHelpButton() {
  return (
    <SectionHelpButton ariaLabel="How to patch fixtures">
      <HelpTitle>How to patch fixtures</HelpTitle>
      <HelpIntro>
        First define fixture types in the Fixtures list on the left. Then use
        this panel to assign them to DMX addresses and place them on the map
        below.
      </HelpIntro>
      <HelpList>
        <li>
          To work on another output, change the <strong>Universe</strong>{' '}
          number.
        </li>
        <li>
          To add a fixture, click an empty gap in the channel strip and choose
          a type. If no types appear, create or import one under{' '}
          <strong>Fixtures</strong> first.
        </li>
        <li>
          To select a patched fixture, click its block. You can rename it in
          the block, or remove it with the <strong>×</strong> in the top-right
          corner.
        </li>
        <li>
          To assign scene groups, select the fixture and use{' '}
          <strong>Groups…</strong> in the panel below the map.
        </li>
        <li>
          To set where a fixture sits on stage, use the placement map below —
          open its help button for moving, nudging, and depth placement.
        </li>
      </HelpList>
    </SectionHelpButton>
  )
}
