import { useState } from 'react'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import IconButton from '@mui/material/IconButton'
import styled from 'styled-components'
import {
  FieldHelpButton,
  HelpIntro,
  HelpList,
} from '../base/SectionHelpPopover'
import AppModal from '../overlays/AppModal'

const ModalSection = styled.div`
  & + & {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid ${(p) => p.theme.colors.divider};
  }
`

const ModalSectionTitle = styled.div`
  font-size: 0.84rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
  color: ${(p) => p.theme.colors.text.primary};
`

export function Lighting3DPageHelpButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <IconButton
        size="small"
        aria-label="Open Lighting 3D help"
        title="Help — preview, camera, and moving lights"
        onClick={() => setOpen(true)}
        onMouseDown={(e) => e.stopPropagation()}
        sx={{
          padding: '0.12rem',
          color: 'text.secondary',
          '&:hover': { color: 'text.primary' },
        }}
      >
        <InfoOutlined sx={{ fontSize: '1rem' }} />
      </IconButton>
      <AppModal
        open={open}
        title="Lighting 3D Preview"
        onClose={() => setOpen(false)}
        maxWidth="38rem"
        actions={[{ label: 'Got it', onClick: () => setOpen(false) }]}
      >
        <ModalSection>
          <ModalSectionTitle>What you are looking at</ModalSectionTitle>
          <HelpIntro>
            A live 3D view of your lights. Colors and brightness match your current
            show, so you can check looks before you go live.
          </HelpIntro>
        </ModalSection>

        <ModalSection>
          <ModalSectionTitle>Preview options</ModalSectionTitle>
          <HelpList>
            <li>
              <strong>Curtain</strong> — show or hide the backdrop behind your stage.
            </li>
            <li>
              <strong>Floor outline</strong> — outline of your dance floor area.
            </li>
            <li>
              <strong>Room</strong> — walls around the space; adjust width, depth, and
              height to match your venue.
            </li>
          </HelpList>
        </ModalSection>

        <ModalSection>
          <ModalSectionTitle>Moving the camera</ModalSectionTitle>
          <HelpList>
            <li>Drag inside the preview to orbit around the room.</li>
            <li>Scroll the mouse wheel to zoom in and out.</li>
            <li>
              Click <strong>Home</strong> in the preview to reset to the default view.
            </li>
          </HelpList>
        </ModalSection>

        <ModalSection>
          <ModalSectionTitle>Selecting fixtures</ModalSectionTitle>
          <HelpList>
            <li>Left-click a light to select it in the app.</li>
            <li>Left-click empty space to hide the move/rotate gizmo.</li>
            <li>
              Right-click a light to show the gizmo for placing it in the room.
            </li>
          </HelpList>
        </ModalSection>

        <ModalSection>
          <ModalSectionTitle>Moving and rotating lights</ModalSectionTitle>
          <HelpList>
            <li>
              After right-clicking a light, drag the gizmo arrows to move it, or the
              rings to rotate it (fixed lights only — moving-head lights can be moved,
              not rotated here).
            </li>
            <li>
              Press <strong>Q</strong> for move mode or <strong>E</strong> for rotate
              mode while a gizmo is visible.
            </li>
            <li>
              For hung movers, use the <strong>Mount</strong> button to flip upright vs
              hung.
            </li>
          </HelpList>
        </ModalSection>

        <ModalSection>
          <ModalSectionTitle>Fixture map sync</ModalSectionTitle>
          <HelpIntro>
            When you move or rotate a light in the 3D preview, its position updates in
            the fixture map and placement views in the main window — and changes from
            those views update here too. You can work in either place.
          </HelpIntro>
        </ModalSection>
      </AppModal>
    </>
  )
}

export function Lighting3DCurtainHelpButton() {
  return (
    <FieldHelpButton ariaLabel="What the curtain toggle does">
      Shows or hides the curtain behind your stage.
    </FieldHelpButton>
  )
}

export function Lighting3DBoundsHelpButton() {
  return (
    <FieldHelpButton ariaLabel="What the floor outline toggle does">
      Draws an outline on the floor so you can see the edges of your dance area.
    </FieldHelpButton>
  )
}

export function Lighting3DRoomHelpButton() {
  return (
    <FieldHelpButton ariaLabel="What the room toggle does">
      Turns room walls on or off so you can judge scale and spacing.
    </FieldHelpButton>
  )
}

export function Lighting3DRoomSizeHelpButton() {
  return (
    <FieldHelpButton ariaLabel="How room size works" anchorHorizontal="right">
      Set how wide, deep, and tall the room is. Match your venue when you can — it
      helps place fixtures at realistic distances.
    </FieldHelpButton>
  )
}
