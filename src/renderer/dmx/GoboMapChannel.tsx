import { useState } from 'react'
import styled from 'styled-components'
import { IconButton } from '@mui/material'
import Add from '@mui/icons-material/Add'
import Remove from '@mui/icons-material/Remove'
import NumberField from 'renderer/base/NumberField'
import Input from 'renderer/base/Input'
import { ChannelGoboMap, DMX_MAX_VALUE, DMX_MIN_VALUE } from '../../shared/dmxFixtures'
import wrapClick from 'renderer/base/wrapClick'

interface Props {
  ch: ChannelGoboMap
  onChange: (newChannel: ChannelGoboMap) => void
}

export default function GoboMapChannel({ ch, onChange }: Props) {
  const [activeIndex, setActiveIndex] = useState(
    Math.max(0, Math.min(ch.defaultIndex, ch.gobos.length - 1))
  )

  const safeDefaultIndex = Math.max(0, Math.min(ch.defaultIndex, ch.gobos.length - 1))

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

  return (
    <Root>
      <HeaderRow>
        <Info style={{ flex: '1 0 8rem' }}>Gobo</Info>
        <Info>DMX Max</Info>
      </HeaderRow>

      {ch.gobos.map((gobo, index) => {
        const isDefault = safeDefaultIndex === index
        const isEditing = activeIndex === index
        return (
          <GoboRow key={`${index}-${gobo.name}`}>
            <DefaultDot
              isDefault={isDefault}
              onClick={wrapClick(() => setDefaultIndex(index))}
              title={isDefault ? 'Default gobo' : 'Set as default gobo'}
            />
            <NameCell
              onClick={wrapClick(() => setActiveIndex(index))}
              title="Gobo name"
            >
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
            {!isEditing && <RowSpacer />}
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

const NameCell = styled.div`
  flex: 1 0 8rem;
`

const ButtonRow = styled.div`
  display: flex;
  align-items: center;
`

const RowSpacer = styled.div`
  width: 1.1rem;
`
