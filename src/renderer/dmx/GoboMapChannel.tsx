import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import { IconButton } from '@mui/material'
import Add from '@mui/icons-material/Add'
import Remove from '@mui/icons-material/Remove'
import NumberField from 'renderer/base/NumberField'
import Input from 'renderer/base/Input'
import { ChannelGoboMap, DMX_MAX_VALUE, DMX_MIN_VALUE } from '../../shared/dmxFixtures'
import wrapClick from 'renderer/base/wrapClick'
import { useDmxSelector, useTypedSelector } from '../redux/store'
import {
  clearGoboMapCalibrationOverride,
  setGoboMapCalibrationOverride,
} from '../redux/guiSlice'

interface Props {
  ch: ChannelGoboMap
  fixtureID: string
  channelIndex: number
  onChange: (newChannel: ChannelGoboMap) => void
}

function clampDmxValue(value: number, fallback: number = 0): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, Math.round(value)))
}

function getGoboMapPreviewDmxValue(
  gobos: ChannelGoboMap['gobos'],
  activeIndex: number
): number {
  if (gobos.length === 0) return DMX_MIN_VALUE

  const sorted = gobos
    .map((gobo, index) => ({
      index,
      max: clampDmxValue(gobo.max),
    }))
    .sort((left, right) => left.max - right.max)

  const sortedIndex = sorted.findIndex((entry) => entry.index === activeIndex)
  if (sortedIndex === -1) {
    return sorted[0]?.max ?? DMX_MIN_VALUE
  }

  const entry = sorted[sortedIndex]
  const previousMax = sortedIndex > 0 ? sorted[sortedIndex - 1].max : DMX_MIN_VALUE - 1
  const rangeMin = Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, previousMax + 1))
  const rangeMax = Math.min(DMX_MAX_VALUE, Math.max(rangeMin, entry.max))

  if (rangeMin >= rangeMax) {
    return rangeMax
  }

  return Math.round((rangeMin + rangeMax) / 2)
}

export default function GoboMapChannel({
  ch,
  fixtureID,
  channelIndex,
  onChange,
}: Props) {
  const dispatch = useDispatch()
  const [activeIndex, setActiveIndex] = useState(
    Math.max(0, Math.min(ch.defaultIndex, ch.gobos.length - 1))
  )

  const hasAssignedFixture = useDmxSelector((dmx) =>
    dmx.universe.some((fixture) => fixture.type === fixtureID)
  )
  const currentOverride = useTypedSelector(
    (state) => state.gui.goboMapCalibrationOverride
  )

  const safeDefaultIndex = Math.max(0, Math.min(ch.defaultIndex, ch.gobos.length - 1))
  const safeActiveIndex = Math.max(0, Math.min(activeIndex, ch.gobos.length - 1))

  function updateGobo(
    index: number,
    updater: (gobo: ChannelGoboMap['gobos'][number]) => ChannelGoboMap['gobos'][number]
  ) {
    const nextGobos = ch.gobos.map((gobo, goboIndex) =>
      goboIndex === index ? updater(gobo) : gobo
    )

    onChange({
      ...ch,
      gobos: nextGobos,
      defaultIndex: Math.max(0, Math.min(ch.defaultIndex, nextGobos.length - 1)),
    })
  }

  function setDefaultIndex(index: number) {
    const clamped = Math.max(0, Math.min(index, ch.gobos.length - 1))
    setActiveIndex(clamped)
    onChange({
      ...ch,
      defaultIndex: clamped,
    })
  }

  function addGobo() {
    const nextGobos = ch.gobos.concat({
      name: `Gobo ${ch.gobos.length + 1}`,
      max: DMX_MIN_VALUE,
    })

    onChange({
      ...ch,
      gobos: nextGobos,
      defaultIndex: safeDefaultIndex,
    })
  }

  function removeActiveGobo() {
    if (ch.gobos.length <= 1) return

    const removeIndex = Math.max(0, Math.min(activeIndex, ch.gobos.length - 1))
    const nextGobos = ch.gobos.filter((_, index) => index !== removeIndex)
    const nextDefaultIndex = Math.max(0, Math.min(safeDefaultIndex, nextGobos.length - 1))

    setActiveIndex(Math.max(0, Math.min(removeIndex, nextGobos.length - 1)))
    onChange({
      ...ch,
      gobos: nextGobos,
      defaultIndex: nextDefaultIndex,
    })
  }

  useEffect(() => {
    if (activeIndex < ch.gobos.length) return
    setActiveIndex(Math.max(0, ch.gobos.length - 1))
  }, [activeIndex, ch.gobos.length])

  useEffect(() => {
    if (!hasAssignedFixture || ch.gobos.length === 0) {
      if (currentOverride !== null) {
        dispatch(clearGoboMapCalibrationOverride())
      }
      return
    }

    const dmxValue = getGoboMapPreviewDmxValue(ch.gobos, safeActiveIndex)

    if (
      currentOverride?.fixtureTypeId === fixtureID &&
      currentOverride.channelIndex === channelIndex &&
      currentOverride.dmxValue === dmxValue
    ) {
      return
    }

    dispatch(
      setGoboMapCalibrationOverride({
        fixtureTypeId: fixtureID,
        channelIndex,
        dmxValue,
      })
    )
  }, [
    dispatch,
    hasAssignedFixture,
    ch.gobos,
    safeActiveIndex,
    fixtureID,
    channelIndex,
    currentOverride,
  ])

  useEffect(() => {
    return () => {
      dispatch(clearGoboMapCalibrationOverride())
    }
  }, [dispatch])

  return (
    <Root>
      <HeaderRow>
        <Info style={{ flex: '1 0 8rem' }}>Gobo</Info>
        <Info>DMX Max</Info>
      </HeaderRow>

      {ch.gobos.map((gobo, index) => {
        const isDefault = safeDefaultIndex === index
        const isEditing = safeActiveIndex === index
        return (
          <GoboRow key={`${index}-${gobo.name}`}>
            <DefaultDot
              isDefault={isDefault}
              onClick={wrapClick(() => setDefaultIndex(index))}
              title={isDefault ? 'Default gobo' : 'Set as default gobo'}
            />
            <PreviewDot
              isActive={isEditing}
              onClick={wrapClick(() => setActiveIndex(index))}
              title="Preview this gobo on patched fixtures"
            />
            <NameCell title="Gobo name">
              <Input
                value={gobo.name}
                onChange={(name) => updateGobo(index, (item) => ({ ...item, name }))}
              />
            </NameCell>
            <NumberField
              val={gobo.max}
              label=""
              min={DMX_MIN_VALUE}
              max={DMX_MAX_VALUE}
              onChange={(max) => updateGobo(index, (item) => ({ ...item, max }))}
            />
          </GoboRow>
        )
      })}

      <ButtonRow>
        <IconButton onClick={addGobo} title="Add gobo entry">
          <Add />
        </IconButton>
        <IconButton
          onClick={removeActiveGobo}
          disabled={ch.gobos.length <= 1}
          title="Remove selected gobo entry"
        >
          <Remove />
        </IconButton>
      </ButtonRow>
    </Root>
  )
}

const Root = styled.div``

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 0.5rem;
`

const GoboRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.4rem;
  gap: 0.5rem;
`

const Info = styled.div`
  font-size: 0.9rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const DefaultDot = styled.div<{ isDefault: boolean }>`
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 0.9rem;
  border: 1px solid #fff;
  background: ${(props) => (props.isDefault ? '#fff' : '#0000')};
  cursor: pointer;
`

const PreviewDot = styled.div<{ isActive: boolean }>`
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 0.15rem;
  border: 1px solid #fff;
  background: ${(props) => (props.isActive ? '#8cf' : '#0000')};
  cursor: pointer;
`

const NameCell = styled.div`
  flex: 1 0 8rem;
`

const ButtonRow = styled.div`
  display: flex;
  align-items: center;
`
