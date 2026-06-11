import { Fixture } from '../../shared/dmxFixtures'
import { useDmxSelector, useControlSelector } from '../redux/store'
import FixturePlacement from './FixturePlacement'
import UniverseSlot from './UniverseSlot'
import styled from 'styled-components'
import { TextField, Tooltip } from '@mui/material'
import { useDispatch } from 'react-redux'
import { setActiveUniverse } from '../redux/dmxSlice'
import { Slot_t } from './UniverseSlotTypes'
import PatchingHelpButton from './PatchingHelpButton'

interface FixtureWithIndex {
  fixture: Fixture
  globalIndex: number
}

export default function MyUniverse() {
  const dispatch = useDispatch()
  const activeUniverse = useDmxSelector((state) => state.activeUniverse)
  const universeCount = useControlSelector(
    (state) => state.device.connectionSettings.universeCount
  )
  const fixtures = useDmxSelector((state) =>
    state.universe
      .map((fixture, globalIndex) => ({ fixture, globalIndex }))
      .filter(({ fixture }) => (fixture.universe ?? 1) === state.activeUniverse)
  )
  const fixtureTypesByID = useDmxSelector((state) => state.fixtureTypesByID)

  function getSlots(universe: FixtureWithIndex[]): Slot_t[] {
    const slots: Slot_t[] = []

    if (universe.length > 0) {
      if (universe[0].fixture.ch > 1) {
        slots.push({
          kind: 'gap',
          ch: 1,
          count: universe[0].fixture.ch - 1,
        })
      }

      for (let i = 0; i < universe.length - 1; i++) {
        const f0 = universe[i].fixture
        const f1 = universe[i + 1].fixture
        const f0ChannelCount = Math.max(
          1,
          fixtureTypesByID[f0.type]?.channels.length ?? 1
        )
        const f0_endCh = f0.ch + f0ChannelCount - 1

        slots.push({
          kind: 'fixture',
          fixture: f0,
          globalIndex: universe[i].globalIndex,
          localIndex: i,
        })

        if (f1.ch - (f0_endCh + 0) > 1) {
          slots.push({
            kind: 'gap',
            ch: f0_endCh + 1,
            count: f1.ch - (f0_endCh + 1),
          })
        }
      }

      slots.push({
        kind: 'fixture',
        fixture: universe[universe.length - 1].fixture,
        globalIndex: universe[universe.length - 1].globalIndex,
        localIndex: universe.length - 1,
      })

      const last = universe[universe.length - 1].fixture
      const lastCount = Math.max(
        1,
        fixtureTypesByID[last.type]?.channels.length ?? 1
      )
      const lastChannel = last.ch + lastCount - 1
      if (lastChannel < 512) {
        slots.push({
          kind: 'gap',
          ch: lastChannel + 1,
          count: 512 - lastChannel,
        })
      }
    } else {
      slots.push({
        kind: 'gap',
        ch: 1,
        count: 512,
      })
    }

    return slots
  }

  const elements = getSlots(fixtures).map((slot, index) => {
    return <UniverseSlot key={index} slot={slot} />
  })

  return (
    <Root>
      <HeaderRow>
        <TitleCluster>
          <Header>Patching</Header>
          <PatchingHelpButton />
        </TitleCluster>
        <Tooltip title="DMX universe shown in the patch list and placement map">
          <TextField
            value={activeUniverse.toString()}
            size="small"
            label="Universe"
            onChange={(e) => {
              const value = parseInt(e.target.value, 10)
              if (!Number.isNaN(value)) {
                dispatch(setActiveUniverse(value))
              }
            }}
            type="number"
            inputProps={{ min: 1, max: universeCount }}
          />
        </Tooltip>
      </HeaderRow>
      <Slots>{elements}</Slots>
      <PlacementArea>
        <FixturePlacement />
      </PlacementArea>
    </Root>
  )
}

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0 0 0.5rem;
`

const TitleCluster = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
`

const Header = styled.div`
  font-size: ${(props) => props.theme.font.size.h1};
`

const Root = styled.div`
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 0;
  overflow: hidden;
`

const Slots = styled.div`
  display: flex;
  flex-direction: row;
  align-items: start;
  flex-wrap: wrap;
  flex: 0 0 auto;
  max-height: clamp(5.5rem, 24vh, 12rem);
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  margin-bottom: 0.45rem;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a33 #0000;

  &::-webkit-scrollbar {
    display: block !important;
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
`

const PlacementArea = styled.div`
  flex: 1 1 0;
  min-height: 0;
  display: flex;
`
