import SectionHelpButton, {
  FieldHelpButton,
  HelpIntro,
  HelpList,
  HelpTitle,
} from '../base/SectionHelpPopover'

export function MoverGroupsHelpButton() {
  return (
    <SectionHelpButton ariaLabel="How movers work">
      <HelpTitle>How movers work</HelpTitle>
      <HelpIntro>
        In basic mode, the pan/tilt pad aims each fixture directly — the center of
        the pad is each mover&apos;s home (up for upright rigs, down for hung rigs).
        Turn on Advanced for floor bounds, calibration, groups, and follow override.
      </HelpIntro>
      <HelpList>
        <li>
          <strong>Advanced</strong> unlocks renaming groups, calibration, corner
          bounds, a live grid, and the dance-floor map.
        </li>
        <li>
          <strong>Upright</strong> / <strong>Hung</strong> should match how the fixture
          is mounted on the truss.
        </li>
      </HelpList>
    </SectionHelpButton>
  )
}

export function FollowOverrideHelpButton() {
  return (
    <SectionHelpButton ariaLabel="How follow override works">
      <HelpTitle>How follow override works</HelpTitle>
      <HelpIntro>
        Makes selected mover groups aim at one spot on the floor instead of following
        scene pan/tilt — handy when you want every head looking the same way during
        a live tweak.
      </HelpIntro>
      <HelpList>
        <li>
          X/Y pick a position on the floor map (0 = one side, 1 = the other). You can
          map the toggle and knobs with MIDI learn from the status bar.
        </li>
        <li>
          <strong>All Groups</strong> applies everywhere; <strong>Selected</strong>{' '}
          only affects checked groups.
        </li>
      </HelpList>
    </SectionHelpButton>
  )
}

export function LivePanTiltGridHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How the live pan/tilt grid works">
      Shows where each mover is pointing right now. The dot is pan/tilt on a 0–1
      scale. Click a card to open calibration for that fixture.
    </FieldHelpButton>
  )
}

export function DanceFloorMapHelpButton() {
  return (
    <SectionHelpButton ariaLabel="How the dance floor map works">
      <HelpTitle>How the dance floor map works</HelpTitle>
      <HelpIntro>
        A top-down view of the stage: small dot = fixture position, large dot =
        where the beam hits the floor (from calibration and bounds).
      </HelpIntro>
      <HelpList>
        <li>
          Back of stage is at the top; audience is at the bottom (same as the fixture
          placement map).
        </li>
        <li>
          Corner bounds make floor spots accurate. Without them, placement position is
          used as a rough guess (fainter lines).
        </li>
        <li>Brighter lines mean a more confident floor estimate.</li>
      </HelpList>
    </SectionHelpButton>
  )
}

export function MoverCalibrationDialogHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How mover calibration works">
      Set pan/tilt channel values and how far the head can physically move. Corner
      bounds tie the scene pad to spots on the floor. Click a field to send that
      value to the selected fixture while you aim it.
    </FieldHelpButton>
  )
}

export function MountOrientationHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How mount orientation works">
      Pick upright or hung to match the rig. Hung fixtures use different tilt labels
      — aim at the ceiling or floor references while you calibrate.
    </FieldHelpButton>
  )
}

export function PanCalibrationHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How pan calibration works">
      Min/Max limit how far pan can travel. Front/Back are aim points on stage. Home
      is where the head rests. Range is total degrees of movement. Reverse swaps
      which way pan increases.
    </FieldHelpButton>
  )
}

export function TiltCalibrationHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How tilt calibration works">
      Same idea as pan, with forward and up/down references. Point the fixture at
      each reference while you enter values.
    </FieldHelpButton>
  )
}

export function BoundCornersHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How bound corners work">
      Per fixture: pan/tilt at each corner of the floor area. When floor bounds are
      locked, the scene pad moves within this rectangle.
    </FieldHelpButton>
  )
}

export function MoverFloorBoundsHelpButton() {
  return (
    <FieldHelpButton ariaLabel="Floor bounds vs free aim">
      Locked: the pad aims within your calibrated floor area (set corners on the
      Movers page). Free aim: the pad maps straight to the fixture&apos;s physical
      limits.
    </FieldHelpButton>
  )
}

export function MoverPatternHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How mover patterns work">
      Follow: all movers aim at the same pad point. Tandem: copies spaced along the
      aim line. Mirror: flips pan or tilt for symmetric pairs.
    </FieldHelpButton>
  )
}
