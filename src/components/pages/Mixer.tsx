import React from 'react'
import styled from 'styled-components'
import Slider from '../base/Slider'
import { useTypedSelector } from '../../redux/store'
import { useDispatch } from 'react-redux'
import { dmxSlice, setOverwrite } from '../../redux/dmxSlice'
import ArrowBackIosIcon from '@material-ui/icons/ArrowBackIos'
import ArrowForwardIosIcon from '@material-ui/icons/ArrowForwardIos'
import DraggableNumber from '../base/DraggableNumber'
import { TextField, IconButton } from '@material-ui/core'
import { setPageIndex, setChannelsPerPage } from '../../redux/mixerSlice'

const MAX_DMX = 512

export default function Mixer() {
  const _s = useTypedSelector(state => state.mixer)

  const minIndex = _s.pageIndex * _s.channelsPerPage
  const maxIndex = Math.min(minIndex + _s.channelsPerPage, MAX_DMX);
  const dmxIndexes: number[] = []
  for (let i=minIndex ; i<maxIndex ; i++) {
    dmxIndexes.push(i)
  }

  return (
    <Root>
      <Header />
      <SliderWrapper>
        {dmxIndexes.map(i => <LabelledSlider key={i} index={i} />)}
      </SliderWrapper>
    </Root>
  )
}

const Root = styled.div`
  
`

const SliderWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  padding: 1rem;
`

function Header() {
  const dispatch = useDispatch()
  const _s = useTypedSelector(state => state.mixer)
  const canGoBack = _s.pageIndex > 0
  const canGoForward = (_s.pageIndex + 1) *_s.channelsPerPage < MAX_DMX

  return (
    <HeaderRoot>
      <IconButton disabled={!canGoBack} onClick={() => dispatch(setPageIndex(_s.pageIndex - 1))}><ArrowBackIosIcon /></IconButton>
      {_s.pageIndex + 1}
      <IconButton disabled={!canGoForward} onClick={() => dispatch(setPageIndex(_s.pageIndex + 1))}><ArrowForwardIosIcon /></IconButton>
      <TextField value={_s.channelsPerPage.toString()} onChange={e => dispatch(setChannelsPerPage(parseInt(e.target.value)))} type="number"/>
    </HeaderRoot>
  )
}

const HeaderRoot = styled.div`
  display: flex;
  align-items: center;
`

// HeaderItem
const HI = styled.div`
  display: flex;
  justify-content: center;
  min-width: 1rem;
`

function LabelledSlider({ index }: { index: number }) {
  const val: number | undefined = useTypedSelector(state => state.dmx.overwrites[index])
  const dispatch = useDispatch()

  const onChange = (newVal: number) => {
    dispatch(setOverwrite({index: index, value: newVal}))
  }

  return (
    <Col>
      <Slider value={val} radius={0.5} onChange={onChange} orientation="vertical" disabled={val === undefined}></Slider>
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