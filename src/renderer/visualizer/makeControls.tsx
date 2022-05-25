import { IconButton, Slider, Switch, TextField } from '@mui/material'
import Select from 'renderer/base/Select'
import styled from 'styled-components'
import AddIcon from '@mui/icons-material/Add'
import { MultilineInput } from 'renderer/base/Input'
import { Range } from 'types/baseTypes'

export default function makeControls<SuperConfig>(
  superConfig: SuperConfig,
  onChange: (config: SuperConfig) => void
) {
  function makeOnChange<Config, Val>(key: keyof Config) {
    return (newVal: Val) =>
      onChange({
        ...superConfig,
        [key]: newVal,
      })
  }
  function makeSlider<Config>(
    label: string,
    config: Config,
    key: keyof Config,
    min?: number,
    max?: number,
    step?: number
  ) {
    const _min = min ?? 0
    const _max = max ?? 1
    const _step = step ?? 0.01
    return (
      <Root>
        <Label>{label}</Label>
        <Slider
          //@ts-ignore
          value={config[key]}
          min={_min}
          max={_max}
          step={_step}
          onChange={(_e, value) => makeOnChange(key)(value)}
          valueLabelDisplay="off"
        />
      </Root>
    )
  }
  function makeRangeSlider<Config>(
    label: string,
    config: Config,
    key: keyof Config,
    min?: number,
    max?: number,
    step?: number
  ) {
    const _min = min ?? 0
    const _max = max ?? 1
    const _step = step ?? 0.01

    const range = config[key] as unknown as Range
    const values = [range.min, range.max]
    return (
      <Root>
        <Label>{label}</Label>
        <Slider
          //@ts-ignore
          value={values}
          min={_min}
          max={_max}
          step={_step}
          onChange={(_e, newVals) => {
            let newValues = newVals as [number, number]
            let min = Math.min(...newValues)
            let max = Math.max(...newValues)
            makeOnChange(key)({
              min,
              max,
            })
          }}
          valueLabelDisplay="off"
        />
      </Root>
    )
  }

  function makeSwitch<Config>(
    label: string,
    config: Config,
    key: keyof Config
  ) {
    return (
      <Root>
        <Switch
          //@ts-ignore
          checked={config[key]}
          onChange={(e) => makeOnChange(key)(e.target.checked)}
        />
        <Label>{label}</Label>
      </Root>
    )
  }

  function makeNumberInput<Config>(
    label: string,
    config: Config,
    key: keyof Config
  ) {
    return (
      <Root>
        <Label>{label}</Label>
        <TextField
          size="small"
          value={config[key]}
          type="number"
          onChange={(e) => makeOnChange(key)(e.target.value)}
        />
      </Root>
    )
  }

  function makeTextInput<Config>(
    label: string,
    config: Config,
    key: keyof Config
  ) {
    let val = config[key] as unknown as string
    return (
      <Root>
        <Label>{label}</Label>
        <MultilineInput value={val} onChange={makeOnChange(key)} />
        {/* <Input value={config[key]} onChange={makeOnChange(key)} /> */}
        {/* <TextField
          size="small"
          value={config[key]}
          onChange={(e) => makeOnChange(key)(e.target.value)}
          multiline
        /> */}
      </Root>
    )
  }

  function makeSelect<Config, Val>(
    label: string,
    config: Config,
    items: Val[],
    key: keyof Config
  ) {
    return (
      <Root>
        <Label>{label}</Label>
        <Select
          label={label}
          val={config[key]}
          //@ts-ignore
          items={items}
          onChange={makeOnChange(key)}
        />
      </Root>
    )
  }

  function makeInputArray<Config>(
    label: string,
    config: Config,
    key: keyof Config
  ) {
    let array = config[key] as unknown as string[]
    let copy = [...array]
    return (
      <Root>
        <Label>{label}</Label>
        <Col>
          {copy.map((val, i) => (
            <MultilineInput
              key={i}
              value={val}
              onChange={(newVal) => {
                copy[i] = newVal
                makeOnChange(key)(copy)
              }}
              onEmptyDelete={() => {
                copy.splice(i, 1)
                makeOnChange(key)(copy)
              }}
              size="0.8rem"
            />
          ))}
          <IconButton onClick={() => makeOnChange(key)([...copy, ''])}>
            <AddIcon />
          </IconButton>
        </Col>
      </Root>
    )
  }

  return {
    makeOnChange,
    makeSlider,
    makeRangeSlider,
    makeSwitch,
    makeNumberInput,
    makeTextInput,
    makeSelect,
    makeInputArray,
  }
}

const Root = styled.div`
  display: flex;
  align-items: center;
`

const Col = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  & > * {
    margin-bottom: 0.2rem;
  }
`

const Label = styled.div`
  margin-right: 1rem;
  white-space: nowrap;
`
