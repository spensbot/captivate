import styled, { css } from 'styled-components'
import {
  LFO_SHAPE_SLIDER_THUMB_DIAMETER_REM,
} from '../../shared/lfoShapeSlider'

/** Unmodified LFO shape slider — rotated native range, sized by shell container query. */
export const LfoShapeVerticalRange = styled.input<{ $ghost?: boolean }>`
  -webkit-appearance: none;
  appearance: none;
  width: max(4.5rem, 100cqh);
  height: 0.92rem;
  margin: 0;
  background: transparent;
  cursor: pointer;
  transform: rotate(-90deg);
  transform-origin: center center;
  outline: none;
  position: relative;
  flex: 0 0 auto;

  ${(p) =>
    p.$ghost
      ? css`
          z-index: 2;

          &::-webkit-slider-runnable-track {
            background: transparent;
          }

          &::-webkit-slider-thumb {
            opacity: 0;
          }

          &::-moz-range-track {
            background: transparent;
          }

          &::-moz-range-thumb {
            opacity: 0;
          }

          &::-moz-range-progress {
            background: transparent;
          }
        `
      : css`
          &::-webkit-slider-runnable-track {
            width: 100%;
            height: 0.24rem;
            border-radius: 999px;
            background: linear-gradient(to top, #5a5a5a, #9e9e9e);
          }

          &::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: ${LFO_SHAPE_SLIDER_THUMB_DIAMETER_REM}rem;
            height: ${LFO_SHAPE_SLIDER_THUMB_DIAMETER_REM}rem;
            margin-top: calc(
              (0.24rem - ${LFO_SHAPE_SLIDER_THUMB_DIAMETER_REM}rem) / 2
            );
            border-radius: 999px;
            border: 1px solid rgba(0, 0, 0, 0.55);
            background: #ffd896;
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3);
          }

          &::-moz-range-track {
            width: 100%;
            height: 0.24rem;
            border: none;
            border-radius: 999px;
            background: linear-gradient(to top, #5a5a5a, #9e9e9e);
          }

          &::-moz-range-thumb {
            width: ${LFO_SHAPE_SLIDER_THUMB_DIAMETER_REM}rem;
            height: ${LFO_SHAPE_SLIDER_THUMB_DIAMETER_REM}rem;
            border-radius: 999px;
            border: 1px solid rgba(0, 0, 0, 0.55);
            background: #ffd896;
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3);
          }

          &::-moz-range-progress {
            height: 0.24rem;
            border-radius: 999px;
            background: #8fb0ff;
          }
        `}
`
