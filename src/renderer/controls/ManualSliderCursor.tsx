import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import type { DefaultParam } from '../../shared/params'
import type { ModManualAnchor } from '../../shared/modulation'
import { setModManualAnchor } from '../redux/controlSlice'
import { useActiveLightScene } from '../redux/store'
import SliderCursor from '../base/SliderCursor'

interface Props {
  param: DefaultParam | string
  splitIndex: number
  orientation: 'vertical' | 'horizontal'
  radius: number
  value: number
  color: string
  border?: boolean
}

const ANCHOR_OPTIONS: Array<{ id: ModManualAnchor; label: string; hint: string }> = [
  {
    id: 'center',
    label: 'Center anchor',
    hint: 'Modulation swings around the manual set-point (default).',
  },
  {
    id: 'bottom',
    label: 'Bottom anchor',
    hint: 'Manual is the floor (e.g. Audio Energy 0 = manual, louder pushes up).',
  },
  {
    id: 'top',
    label: 'Top anchor',
    hint: 'Manual is the ceiling (LFO / energy pulls down from the set-point).',
  },
]

export default function ManualSliderCursor({
  param,
  splitIndex,
  orientation,
  radius,
  value,
  color,
  border,
}: Props) {
  const dispatch = useDispatch()
  const anchor = useActiveLightScene(
    (scene) => scene.splitScenes[splitIndex]?.modManualAnchors?.[param] ?? 'center'
  )
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const closeMenu = useCallback(() => {
    setMenu(null)
  }, [])

  useEffect(() => {
    if (menu === null) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      const el = menuRef.current
      if (el !== null && event.target instanceof Node && el.contains(event.target)) {
        return
      }
      closeMenu()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [closeMenu, menu])

  const onContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setMenu({ x: event.clientX, y: event.clientY })
  }

  const pick = (next: ModManualAnchor) => {
    dispatch(
      setModManualAnchor({
        splitIndex,
        param,
        anchor: next === 'center' ? undefined : next,
      })
    )
    closeMenu()
  }

  const portal =
    menu !== null
      ? createPortal(
          <MenuPanel
            ref={menuRef}
            role="menu"
            style={{ left: menu.x, top: menu.y }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <MenuTitle>Modulation manual anchor</MenuTitle>
            {ANCHOR_OPTIONS.map((opt) => (
              <MenuButton
                key={opt.id}
                type="button"
                role="menuitem"
                $active={anchor === opt.id}
                title={opt.hint}
                onClick={() => pick(opt.id)}
              >
                <MenuCheck aria-hidden>{anchor === opt.id ? '✓' : ''}</MenuCheck>
                <MenuText>
                  <MenuLabel>{opt.label}</MenuLabel>
                  <MenuHint>{opt.hint}</MenuHint>
                </MenuText>
              </MenuButton>
            ))}
          </MenuPanel>,
          document.body
        )
      : null

  return (
    <>
      <ManualCursorFrame>
        <SliderCursor
          orientation={orientation}
          value={value}
          radius={radius}
          color={color}
          border={border}
          pointerEvents="auto"
          onContextMenu={onContextMenu}
        />
      </ManualCursorFrame>
      {portal}
    </>
  )
}

const ManualCursorFrame = styled.span`
  display: block;
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  touch-action: none;
`

const MenuPanel = styled.div`
  position: fixed;
  z-index: 12000;
  min-width: 15.5rem;
  max-width: min(22rem, calc(100vw - 1.5rem));
  padding: 0.35rem 0;
  border-radius: 0.38rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.darker};
  box-shadow: 0 0.35rem 1.1rem #000a;
  transform: translate(-4px, 4px);
`

const MenuTitle = styled.div`
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${(p) => p.theme.colors.text.secondary};
  padding: 0.2rem 0.75rem 0.45rem;
  border-bottom: 1px solid ${(p) => p.theme.colors.divider};
  margin-bottom: 0.2rem;
`

const MenuButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  width: 100%;
  text-align: left;
  border: none;
  background: ${(p) => (p.$active ? '#4a70d033' : 'transparent')};
  color: ${(p) => p.theme.colors.text.primary};
  padding: 0.38rem 0.65rem 0.42rem 0.55rem;
  cursor: pointer;
  font: inherit;

  &:hover {
    background: #ffffff12;
  }
`

const MenuCheck = styled.span`
  flex: 0 0 0.9rem;
  font-size: 0.75rem;
  color: #9ec0ff;
  line-height: 1.35;
`

const MenuText = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
`

const MenuLabel = styled.span`
  font-size: 0.78rem;
  font-weight: 600;
`

const MenuHint = styled.span`
  font-size: 0.66rem;
  color: ${(p) => p.theme.colors.text.secondary};
  line-height: 1.25;
`
