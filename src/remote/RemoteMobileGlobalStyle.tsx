import { createGlobalStyle } from 'styled-components'

/** Touch-friendly overrides for shared renderer UI inside remote mobile mode. */
export default createGlobalStyle`
  [data-remote-ui-mode='mobile'] {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    font-size: 16px;
    --mixer-col-width: 3.5rem;
  }

  [data-remote-ui-mode='mobile'] .MuiIconButton-root {
    min-width: 2.85rem;
    min-height: 2.85rem;
    padding: 0.55rem;
  }

  [data-remote-ui-mode='mobile'] .MuiIconButton-root .MuiSvgIcon-root {
    font-size: 1.45rem;
  }

  [data-remote-ui-mode='mobile'] .MuiButton-root {
    min-height: 2.85rem;
    font-size: 0.95rem;
    padding-top: 0.45rem;
    padding-bottom: 0.45rem;
  }

  [data-remote-ui-mode='mobile'] .MuiOutlinedInput-root {
    font-size: 1rem;
  }

  [data-remote-ui-mode='mobile'] .MuiInputLabel-root {
    font-size: 0.95rem;
  }

  [data-remote-ui-mode='mobile'] .MuiSwitch-root {
    transform: scale(1.15);
  }

  [data-remote-ui-mode='mobile'] input[type='range'] {
    min-height: 2.25rem;
  }

  [data-remote-ui-mode='mobile'] select {
    min-height: 2.75rem;
    font-size: 1rem;
  }

  [data-remote-ui-mode='mobile'] button,
  [data-remote-ui-mode='mobile'] [role='button'] {
    min-height: 2.5rem;
  }

  /* DMX mixer: larger faders and channel tiles on phones */
  [data-remote-ui-mode='mobile'] input[type='range']::-webkit-slider-thumb {
    width: 1.35rem;
    height: 1.35rem;
  }

  [data-remote-ui-mode='mobile'] input[type='range']::-moz-range-thumb {
    width: 1.35rem;
    height: 1.35rem;
  }

  /* LFO modulator cards + modulation strips (mobile remote only) */
  [data-remote-ui-mode='mobile'] [data-remote-mobile-modulation] input[type='range'] {
    min-height: 2.75rem;
  }

  [data-remote-ui-mode='mobile'] [data-remote-mobile-modulation] input[type='range']::-webkit-slider-thumb {
    width: 1.55rem;
    height: 1.55rem;
  }

  [data-remote-ui-mode='mobile'] [data-remote-mobile-modulation] input[type='range']::-moz-range-thumb {
    width: 1.55rem;
    height: 1.55rem;
  }

  [data-remote-ui-mode='mobile'] [data-remote-mobile-modulation] .MuiSelect-select {
    min-height: 2.65rem;
    font-size: 1rem;
    display: flex;
    align-items: center;
  }

  [data-remote-ui-mode='mobile'] [data-remote-mobile-modulation] .MuiInputBase-root {
    font-size: 1rem;
  }
`

