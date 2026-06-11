import SectionHelpButton, {
  FieldHelpButton,
  HelpIntro,
  HelpList,
  HelpTitle,
} from '../base/SectionHelpPopover'

export function ChannelsHelpButton() {
  return (
    <SectionHelpButton ariaLabel="How fixture channels work">
      <HelpTitle>How fixture channels work</HelpTitle>
      <HelpIntro>
        Channels define your fixture&apos;s DMX footprint in order. Click a row to
        set its type, ranges, and behavior.
      </HelpIntro>
      <HelpList>
        <li>
          Use <strong>+</strong> to append a channel. Order matters — it must match
          your real fixture profile.
        </li>
        <li>
          When subfixtures exist, select a segment above, then click the colored
          circle on each channel to assign it.
        </li>
        <li>
          Editing is locked while this fixture type is patched on a universe. Remove
          patches first to change channel count or order.
        </li>
      </HelpList>
    </SectionHelpButton>
  )
}

export function SubfixturesHelpButton() {
  return (
    <SectionHelpButton ariaLabel="How subfixtures work">
      <HelpTitle>How subfixtures work</HelpTitle>
      <HelpIntro>
        Subfixtures split one fixture type into independent segments — separate
        colors, heads, or strips that share one DMX address block.
      </HelpIntro>
      <HelpList>
        <li>
          Add segments with <strong>+</strong> or duplicate an existing one. Each
          gets a letter label (a, b, c…).
        </li>
        <li>
          Select a segment, then toggle channel markers in the Channels list below.
        </li>
        <li>
          Intensity scales that segment in previews. Groups tag it for scene splits
          and modulation routing.
        </li>
        <li>Wash-bar models auto-spread emitters across fixture width.</li>
      </HelpList>
    </SectionHelpButton>
  )
}

export function FixtureModelHelpButton() {
  return (
    <SectionHelpButton ariaLabel="How fixture models work">
      <HelpTitle>How fixture models work</HelpTitle>
      <HelpIntro>
        The model drives 3D preview, emitter layout, and mover beam shape. Live DMX
        control works without editing this — defaults are applied automatically.
      </HelpIntro>
      <HelpList>
        <li>
          Pick a <strong>model type</strong> (PAR, wash, mover, bar, atmosphere).{' '}
          <strong>Auto</strong> infers from your channels.
        </li>
        <li>
          <strong>Emitters per subfixture</strong> sets light source count for each
          segment. Open <strong>WYSIWYG layout</strong> to place them on the face.
        </li>
        <li>
          Dimensions affect stage placement size and wash-bar strip math. Mover beam
          angle sets preview cone width when no focus channel exists.
        </li>
      </HelpList>
    </SectionHelpButton>
  )
}

export function FixtureModelSummaryHelpButton() {
  return (
    <FieldHelpButton ariaLabel="About 3D model and emitters">
      Optional preview setup: model shape, emitter positions, and dimensions.
      Captivate picks sensible defaults so you can patch and play without editing
      this.
    </FieldHelpButton>
  )
}

export function ChannelEditorHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How channel editing works">
      Set channel type and DMX behavior. Split channels use min/max ranges per
      sub-type. Color and gobo maps translate DMX bands to looks. Axis channels
      support coarse + fine pairs and pan/tilt direction.
    </FieldHelpButton>
  )
}
