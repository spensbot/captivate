import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import { IconButton } from '@mui/material'
import Add from '@mui/icons-material/Add'
import Remove from '@mui/icons-material/Remove'
import NumberField from 'renderer/base/NumberField'
import Input from 'renderer/base/Input'
import { ChannelPrismMap, DMX_MAX_VALUE, DMX_MIN_VALUE } from '../../shared/dmxFixtures'
import wrapClick from 'renderer/base/wrapClick'
import { useDmxSelector, useTypedSelector } from '../redux/store'
import {
  clearPrismMapCalibrationOverride,
  setPrismMapCalibrationOverride,
} from '../redux/guiSlice'
import { getPrismMapPreviewDmxValue } from '../../shared/fixtureMapCalibration'

interface Props {
  ch: ChannelPrismMap
  fixtureID: string
  channelIndex: number
  onChange: (newChannel: ChannelPrismMap) => void
}

export default function PrismMapChannel({
  ch,
  fixtureID,
  channelIndex,
  onChange,
}: Props) {
  const dispatch = useDispatch()
  const [activeIndex, setActiveIndex] = useState(
    Math.max(0, Math.min(ch.defaultIndex, ch.prisms.length - 1))
  )

  const hasAssignedFixture = useDmxSelector((dmx) =>
    dmx.universe.some((fixture) => fixture.type === fixtureID)
  )
  const currentOverride = useTypedSelector(
    (state) => state.gui.prismMapCalibrationOverride
  )

  const safeDefaultIndex = Math.max(0, Math.min(ch.defaultIndex, ch.prisms.length - 1))
  const safeActiveIndex = Math.max(0, Math.min(activeIndex, ch.prisms.length - 1))

  function updatePrism(
    index: number,
    updater: (prism: ChannelPrismMap['prisms'][number]) => ChannelPrismMap['prisms'][number]
  ) {
    setActiveIndex(index)
    const nextPrisms = ch.prisms.map((prism, prismIndex) =>
      prismIndex === index ? updater(prism) : prism
    )

    onChange({
      ...ch,
      prisms: nextPrisms,
      defaultIndex: Math.max(0, Math.min(ch.defaultIndex, nextPrisms.length - 1)),
    })
  }

  function setDefaultIndex(index: number) {
    const clamped = Math.max(0, Math.min(index, ch.prisms.length - 1))
    setActiveIndex(clamped)
    onChange({
      ...ch,
      defaultIndex: clamped,
    })
  }

  function addPrism() {
    const nextPrisms = ch.prisms.concat({
      name: `Prism ${ch.prisms.length + 1}`,
      max: DMX_MIN_VALUE,
    })

    onChange({
      ...ch,
      prisms: nextPrisms,
      defaultIndex: safeDefaultIndex,
    })
  }

  function removeActivePrism() {
    if (ch.prisms.length <= 1) return

    const removeIndex = Math.max(0, Math.min(activeIndex, ch.prisms.length - 1))
    const nextPrisms = ch.prisms.filter((_, index) => index !== removeIndex)
    const nextDefaultIndex = Math.max(0, Math.min(safeDefaultIndex, nextPrisms.length - 1))

    setActiveIndex(Math.max(0, Math.min(removeIndex, nextPrisms.length - 1)))
    onChange({
      ...ch,
      prisms: nextPrisms,
      defaultIndex: nextDefaultIndex,
    })
  }

  useEffect(() => {
    if (activeIndex < ch.prisms.length) return
    setActiveIndex(Math.max(0, ch.prisms.length - 1))
  }, [activeIndex, ch.prisms.length])

  useEffect(() => {
    if (!hasAssignedFixture || ch.prisms.length === 0) {
      if (currentOverride !== null) {
        dispatch(clearPrismMapCalibrationOverride())
      }
      return
    }

    const dmxValue = getPrismMapPreviewDmxValue(ch.prisms, safeActiveIndex)

    if (
      currentOverride?.fixtureTypeId === fixtureID &&
      currentOverride.channelIndex === channelIndex &&
      currentOverride.dmxValue === dmxValue
    ) {
      return
    }

    dispatch(
      setPrismMapCalibrationOverride({
        fixtureTypeId: fixtureID,
        channelIndex,
        dmxValue,
      })
    )
  }, [
    dispatch,
    hasAssignedFixture,
    ch.prisms,
    safeActiveIndex,
    fixtureID,
    channelIndex,
    currentOverride,
  ])

  useEffect(() => {
    return () => {
      dispatch(clearPrismMapCalibrationOverride())
    }
  }, [dispatch])

  return (
    <Root>
      <HeaderRow>
        <Info style={{ flex: '1 0 8rem' }}>Prism</Info>
        <Info>DMX Max</Info>
      </HeaderRow>

      {ch.prisms.map((prism, index) => {
        const isDefault = safeDefaultIndex === index
        const isEditing = safeActiveIndex === index
        return (
          <PrismRow key={`${index}-${prism.name}`}>
            <DefaultDot
              isDefault={isDefault}
              onClick={wrapClick(() => setDefaultIndex(index))}
              title={isDefault ? 'Default prism' : 'Set as default prism'}
            />
            <PreviewDot
              isActive={isEditing}
              onClick={wrapClick(() => setActiveIndex(index))}
              title="Preview this prism on patched fixtures"
            />
            <NameCell title="Prism name">
              <Input
                value={prism.name}
                onChange={(name) => updatePrism(index, (item) => ({ ...item, name }))}
              />
            </NameCell>
            <NumberField
              val={prism.max}
              label=""
              min={DMX_MIN_VALUE}
              max={DMX_MAX_VALUE}
              onFocus={() => setActiveIndex(index)}
              onChange={(max) => updatePrism(index, (item) => ({ ...item, max }))}
            />
          </PrismRow>
        )
      })}

      <ButtonRow>
        <IconButton onClick={addPrism} title="Add prism entry">
          <Add />
        </IconButton>
        <IconButton
          onClick={removeActivePrism}
          disabled={ch.prisms.length <= 1}
          title="Remove selected prism entry"
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

const PrismRow = styled.div`
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
