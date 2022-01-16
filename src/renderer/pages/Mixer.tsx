import styled from 'styled-components'
import Slider from '../base/Slider'
import { useTypedSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { TextField, Button } from '@mui/material'
import {
  setPageIndex,
  setChannelsPerPage,
  setOverwrite,
  clearOverwrites,
} from '../redux/mixerSlice'
import { useRealtimeSelector } from '../redux/realtimeStore'
import StatusBar from '../menu/StatusBar'

const MAX_DMX = 512

export default function Mixer() {
  const _s = useTypedSelector((state) => state.mixer)

  const minIndex = _s.pageIndex * _s.channelsPerPage
  const maxIndex = Math.min(minIndex + _s.channelsPerPage, MAX_DMX)
  const dmxIndexes: number[] = []
  for (let i = minIndex; i < maxIndex; i++) {
    dmxIndexes.push(i)
  }

  return (
    <Root>
      <StatusBar />
      <Header />
      <SliderWrapper>
        {dmxIndexes.map((i) => (
          <LabelledSlider key={i} index={i} />
        ))}
      </SliderWrapper>
    </Root>
  )
}

const Root = styled.div``

const SliderWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  padding: 1rem;
`

function Header() {
  const dispatch = useDispatch()
  const _s = useTypedSelector((state) => state.mixer)
  const hasOverwrites = useTypedSelector(
    (state) => state.mixer.overwrites.length > 0
  )
  const canGoBack = _s.pageIndex > 0
  const canGoForward = (_s.pageIndex + 1) * _s.channelsPerPage < MAX_DMX

  return (
    <HeaderRoot>
      <Button
        variant="outlined"
        disabled={!canGoBack}
        onClick={() => dispatch(setPageIndex(_s.pageIndex - 1))}
      >
        {'<'}
      </Button>
      <S />
      {_s.pageIndex + 1}
      <S />
      <Button
        variant="outlined"
        disabled={!canGoForward}
        onClick={() => dispatch(setPageIndex(_s.pageIndex + 1))}
      >
        {'>'}
      </Button>
      <S />
      <TextField
        value={_s.channelsPerPage.toString()}
        size="small"
        onChange={(e) => dispatch(setChannelsPerPage(parseInt(e.target.value)))}
        type="number"
      />
      <S />
      <Button
        disabled={!hasOverwrites}
        variant="contained"
        onClick={() => dispatch(clearOverwrites())}
      >
        Reset Overwrites
      </Button>
    </HeaderRoot>
  )
}

const HeaderRoot = styled.div`
  display: flex;
  align-items: center;
  margin-top: 1rem;
  margin-left: 1rem;
`

const S = styled.div`
  width: 1rem;
`

function LabelledSlider({ index }: { index: number }) {
  const overwrite: number | undefined = useTypedSelector(
    (state) => state.mixer.overwrites[index]
  )
  const output: number = useRealtimeSelector((state) => state.dmxOut[index])
  const dispatch = useDispatch()

  const onChange = (newVal: number) => {
    dispatch(setOverwrite({ index: index, value: newVal }))
  }

  return (
    <Col>
      <Slider
        value={overwrite !== undefined ? overwrite : output / 255}
        radius={0.5}
        onChange={onChange}
        orientation="vertical"
        disabled={overwrite === undefined}
      ></Slider>
      <Label>{(index + 1).toString()}</Label>
    </Col>
  )
}

const Col = styled.div`
  height: 13rem;
  width: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
`

const Label = styled.div`
  padding: 0.3rem;
  margin-bottom: 1rem;
  color: #fff7;
  font-size: 0.8rem;
`
