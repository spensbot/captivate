import SectionHelpButton, { HelpIntro, HelpList, HelpTitle } from '../base/SectionHelpPopover'

export default function EmitterLayoutHelpButton({ isPar }: { isPar: boolean }) {
  return (
    <SectionHelpButton
      ariaLabel="How to lay out emitters"
      anchorHorizontal="right"
    >
      <HelpTitle>How to lay out emitters</HelpTitle>
      <HelpIntro>
        This view shows the real front face of your fixture. Each numbered marker
        is one emitter — arrange them to match the physical layout, then wire
        channels to subfixtures.
      </HelpIntro>
      <HelpList>
        <li>
          To select emitters, use the <strong>Select</strong> tool: drag on empty
          space to box-select, click one emitter, or <strong>Shift+click</strong>{' '}
          to add or remove from the selection.
        </li>
        <li>
          To move emitters, switch to the <strong>Move</strong> tool and drag.
          Hold <strong>Shift</strong> while dragging to turn off snap.
        </li>
        <li>
          To nudge the selection, use the <strong>arrow keys</strong>. Hold{' '}
          <strong>Shift</strong> for larger steps.
        </li>
        <li>
          To wire channels, choose a <strong>subfixture</strong> first, then turn
          on only the channels that subfixture should use. With several emitters
          selected, toggling still updates every selected emitter in that
          subfixture.
        </li>
        <li>
          To place many emitters at once, use <strong>Auto-Generate</strong> for
          PAR ring or grid patterns, then <strong>Auto Assign Channels</strong>{' '}
          to map them to subfixture groups in selection order.
        </li>
        {isPar ? (
          <li>
            PAR <strong>ring</strong> uses a 3-LED center diamond plus 9 on the outer
            edge for 12 emitters; honeycomb, row, and grid use other packings. Sizes
            stay uniform on that ring layout.
          </li>
        ) : null}
      </HelpList>
    </SectionHelpButton>
  )
}
