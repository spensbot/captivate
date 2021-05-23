import React from 'react'
import styled from 'styled-components'
import Slider from '../base/Slider'
import { useTypedSelector } from '../../redux/store'
import { useDispatch } from 'react-redux'
import { setOverwrite } from '../../redux/dmxSlice'

export default function Mixer() {
  const dmxIndexes = Array.from(Array(512).keys()) 

  return (
    <Root>
      {dmxIndexes.map(i => <LabelledSlider key={i} index={i} />)}
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-wrap: wrap;
  padding: 1rem;
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