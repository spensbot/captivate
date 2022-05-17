import { Slider, Switch, TextField } from '@mui/material'
import Select from 'renderer/base/Select'
import styled from 'styled-components'

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
        <Label>{label}</Label>
        <Switch
          //@ts-ignore
          checked={config[key]}
          onChange={(e) => makeOnChange(key)(e.target.checked)}
        />
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
          label={label}
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
    return (
      <Root>
        <Label>{label}</Label>
        <TextField
          label={label}
          value={config[key]}
          onChange={(e) => makeOnChange(key)(e.target.value)}
        />
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

  return {
    makeOnChange,
    makeSlider,
    makeSwitch,
    makeNumberInput,
    makeTextInput,
    makeSelect,
  }
}

const Root = styled.div`
  display: flex;
  align-items: center;
`

const Label = styled.div`
  margin-right: 1rem;
`
