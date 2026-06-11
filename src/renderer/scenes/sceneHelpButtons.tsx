import SectionHelpButton, {
  FieldHelpButton,
  HelpIntro,
  HelpList,
  HelpTitle,
} from '../base/SectionHelpPopover'

export function LightScenesHelpButton() {
  return (
    <SectionHelpButton ariaLabel="How light scenes work">
      <HelpTitle>How light scenes work</HelpTitle>
      <HelpIntro>
        A scene is a saved look for your lights. Each scene holds your motion
        effects, which fixtures respond, and the manual slider values for color,
        brightness, position, and more.
      </HelpIntro>
      <HelpList>
        <li>Click a scene in the list to switch to it on the next beat.</li>
        <li>Drag the handle on the right to reorder scenes.</li>
        <li>
          When a scene is selected, you can rename it, set its energy color bar,
          and choose whether auto mode may use it.
        </li>
        <li>
          Use <strong>+</strong> to add a blank scene, or the copy icon to
          duplicate the current one.
        </li>
        <li>
          Turn on <strong>auto</strong> under the header to let Captivate change
          scenes for you on the beat.
        </li>
      </HelpList>
    </SectionHelpButton>
  )
}

export function AutoSceneHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How automatic scene changes work">
      Turn on <strong>auto</strong> to switch scenes on the beat. The number is
      how many beats to wait between changes. Turn on <strong>energy</strong> or{' '}
      <strong>audio</strong> (when shown) only if you want matching instead of
      random picks. Scenes with a crossed-out icon are skipped.
    </FieldHelpButton>
  )
}

export function EnergyMatchHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How energy matching works">
      Captivate picks the scene whose energy color bar is closest to your target.
      Calm scenes sit on the cool side; intense scenes sit on the warm side. Use
      the slider for a fixed target, or turn on <strong>audio</strong> to follow
      your music (when audio input is on in Connections).
    </FieldHelpButton>
  )
}

export function LfoModulatorsHelpButton() {
  return (
    <SectionHelpButton ariaLabel="How motion effects work">
      <HelpTitle>How motion effects work</HelpTitle>
      <HelpIntro>
        Motion effects are automatic waves that change your lights over time.
        Add one with <strong>+</strong>, pick a shape, then connect it to the
        sliders you want to move.
      </HelpIntro>
      <HelpList>
        <li>
          Pick a shape (or one that follows your music). Music-linked shapes use
          live sound from your audio input.
        </li>
        <li>
          Drag the graph: sideways shifts timing; up/down flips the wave. Use the{' '}
          <strong>Skew</strong> slider (or hold <strong>Ctrl</strong> /{' '}
          <strong>Cmd</strong> and drag up/down) to warp the curve.
        </li>
        <li>
          Sliders on the right fine-tune the shape (how sharp, how smooth, which
          part of the music to listen to, and so on).
        </li>
        <li>
          Colored stripes on the card edge mean one effect is driving another —
          matching colors go together.
        </li>
        <li>
          The list under each card shows the first fixture section. Scroll down
          to edit other sections.
        </li>
      </HelpList>
    </SectionHelpButton>
  )
}

export function SplitScenesHelpButton() {
  return (
    <SectionHelpButton ariaLabel="How fixture sections work">
      <HelpTitle>How fixture sections work</HelpTitle>
      <HelpIntro>
        Sections let different lights behave differently in the same scene. For
        example, movers can move while color washes stay steady.
      </HelpIntro>
      <HelpList>
        <li>
          The first section usually covers everyone. Add more sections for movers,
          washes, fog, and so on.
        </li>
        <li>
          Click <strong>Add Split</strong> for a new section. Remove extras with
          the × on the header (the first section cannot be removed).
        </li>
        <li>
          Use <strong>Add Params</strong> to show more sliders (color, movers,
          strobes, and more).
        </li>
        <li>
          Manual sliders set the base look; the strips above each section set how
          strongly each motion effect pushes them.
        </li>
      </HelpList>
    </SectionHelpButton>
  )
}

export function SplitGroupsHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How groups on a section work">
      Click the pencil to choose which fixture groups this section uses. Each
      group toggles: on → excluded → off. The tune icon opens extra options for
      that section (flip the wave, shift timing, stepped motion).
    </FieldHelpButton>
  )
}

export function ModulationMatrixHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How effect amount strips work">
      Each strip is one slider being driven by this motion effect. Drag sideways:
      middle = no change; farther out = stronger up or down. Click{' '}
      <strong>+</strong> to add more sliders, including driving one effect from
      another.
    </FieldHelpButton>
  )
}

export function AddModulationHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How to connect a motion effect">
      Choose which sliders this effect should move on each section. Rows marked
      On are active; Off are ignored. Some options only appear when the right
      fixtures are patched. Use the bottom section to drive one effect from
      another.
    </FieldHelpButton>
  )
}

export function SplitModShapingHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How section motion options work">
      Only this section: flip the effect direction, shift it earlier or later in
      time, or make it step in chunks instead of moving smoothly.
    </FieldHelpButton>
  )
}

export function AddParamsHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How add params works">
      Adds more manual sliders to this section — color, movers, strobes, and more.
      What you can add depends on which fixtures are patched.
    </FieldHelpButton>
  )
}

export function ManualAnchorHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How manual anchor works">
      Right-click a manual slider dot to choose how the motion effect combines
      with your set value: around your value (default), from your value upward,
      or from your value downward.
    </FieldHelpButton>
  )
}

export function VisualScenesHelpButton() {
  return (
    <SectionHelpButton ariaLabel="How visual scenes work">
      <HelpTitle>How visual scenes work</HelpTitle>
      <HelpIntro>
        Visual scenes are saved looks for the visualizer window — the on-screen
        graphics that go with your show.
      </HelpIntro>
      <HelpList>
        <li>Click a row to switch scenes on the beat.</li>
        <li>
          <strong>Scene Transition</strong> sets how one scene blends into the
          next (instant, fade, dissolve, or flash).
        </li>
        <li>
          Turn on <strong>auto</strong> to advance visual scenes on the beat,
          same as light scenes.
        </li>
      </HelpList>
    </SectionHelpButton>
  )
}

export function VisualSceneTransitionHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How scene transitions work">
      Controls how the picture changes when you pick a new visual scene. Cut
      switches instantly. Fade and dissolve blend over the time you set. Flash
      briefly blanks between scenes.
    </FieldHelpButton>
  )
}
