import styled, { css } from 'styled-components'
import Button from '@mui/material/Button'

/** Thin scrollbar styling used across Captivate panels. */
export const panelScrollbarCss = css`
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a99 #0000;

  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
`

/** Fills the dedicated laser window (see Lighting3D StandalonePreviewRoot). */
export const LaserStandaloneRoot = styled.div`
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

export const LaserPageRoot = styled.div`
  width: 100%;
  height: 100%;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

export const LaserPageContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 1rem 1rem;
  overflow: auto;
  ${panelScrollbarCss}
`

export const LaserPageIntro = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
`

export const LaserPageTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
`

export const LaserPageTitle = styled.h1`
  margin: 0;
  font-size: ${(p) => p.theme.font.size.h1};
  font-weight: 600;
  color: ${(p) => p.theme.colors.text.primary};
`

export const LaserPageTag = styled.span`
  font-size: 0.68rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 999px;
  padding: 0.12rem 0.45rem;
  color: ${(p) => p.theme.colors.text.secondary};
`

export const LaserPageHint = styled.p`
  margin: 0;
  font-size: 0.8rem;
  color: ${(p) => p.theme.colors.text.secondary};
  line-height: 1.4;
  max-width: 52rem;
`

export const LaserMainGrid = styled.div`
  flex: 1 1 auto;
  min-height: 18rem;
  min-width: 0;
  display: grid;
  grid-template-columns:
    minmax(0, min(16rem, 100%))
    minmax(0, 1fr)
    minmax(0, min(16rem, 100%));
  gap: 0.75rem;
  align-items: stretch;

  @media (max-width: 1400px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    grid-template-areas:
      'setup editor'
      'control editor';

    & > :nth-child(1) {
      grid-area: setup;
    }
    & > :nth-child(2) {
      grid-area: editor;
    }
    & > :nth-child(3) {
      grid-area: control;
    }
  }

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'setup'
      'control'
      'editor';
  }
`

export const LaserPanel = styled.section`
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.4rem;
  background: ${(p) => p.theme.colors.bg.darker};
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

export const LaserPanelHeader = styled.div`
  flex-shrink: 0;
  padding: 0.75rem 0.85rem 0.55rem;
  border-bottom: 1px solid ${(p) => p.theme.colors.divider};
`

export const LaserPanelTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
`

export const LaserPanelTitle = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: ${(p) => p.theme.colors.text.primary};
`

export const LaserPanelHint = styled.p`
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  color: ${(p) => p.theme.colors.text.secondary};
  line-height: 1.35;
`

export const LaserPanelBody = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.65rem 0.75rem 0.75rem;
  ${panelScrollbarCss}
`

export const LaserSection = styled.div`
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.35rem;
  background: ${(p) => p.theme.colors.bg.primary};
  padding: 0.55rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

export const LaserSectionTitle = styled.h3`
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: ${(p) => p.theme.colors.text.primary};
`

export const LaserFieldLabel = styled.label`
  display: block;
  font-size: 0.76rem;
  font-weight: 600;
  color: ${(p) => p.theme.colors.text.secondary};
`

export const LaserMuted = styled.div`
  margin: 0;
  font-size: 0.72rem;
  color: ${(p) => p.theme.colors.text.secondary};
  line-height: 1.35;
`

export const LaserTextInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.3rem;
  background: ${(p) => p.theme.colors.bg.darker};
  color: ${(p) => p.theme.colors.text.primary};
  padding: 0.32rem 0.42rem;
  font-size: 0.78rem;
`

export const LaserSelect = styled.select`
  width: 100%;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.3rem;
  background: ${(p) => p.theme.colors.bg.darker};
  color: ${(p) => p.theme.colors.text.primary};
  padding: 0.32rem 0.4rem;
  font-size: 0.78rem;
`

export const LaserActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
`

export const LaserInlineButton = styled(Button).attrs({
  size: 'small',
  variant: 'outlined',
})`
  && {
    min-width: 0;
    font-size: 0.72rem;
    text-transform: none;
  }
`

export const LaserPrimaryButton = styled(Button).attrs({
  size: 'small',
  variant: 'contained',
})`
  && {
    min-width: 0;
    font-size: 0.72rem;
    text-transform: none;
  }
`

export const LaserSetupCallout = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 0 0.75rem 0.55rem;
  padding: 0.45rem 0.55rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.35rem;
  background: ${(p) => p.theme.colors.bg.panel};
  font-size: 0.74rem;
  color: ${(p) => p.theme.colors.text.secondary};
`

export const LaserToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`

export const LaserToggleLabel = styled.span`
  font-size: 0.76rem;
  color: ${(p) => p.theme.colors.text.primary};
`

export const LaserConnectionStatus = styled.span<{ $connected: boolean }>`
  font-size: 0.72rem;
  border: 1px solid ${(p) => (p.$connected ? '#2ea56b' : '#a15858')};
  color: ${(p) => (p.$connected ? '#b8ffd9' : '#ffd7d7')};
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  white-space: nowrap;
`

export const LaserWizardBody = styled.div`
  font-size: 0.8rem;
  color: ${(p) => p.theme.colors.text.primary};
  line-height: 1.45;

  p {
    margin: 0 0 0.55rem;
  }
`

export const LaserWizardHint = styled.div`
  font-size: 0.72rem;
  color: ${(p) => p.theme.colors.text.secondary};
  line-height: 1.35;
`

export const LaserWizardReviewRow = styled.div`
  display: grid;
  grid-template-columns: 7rem 1fr;
  gap: 0.5rem;
  font-size: 0.78rem;
  color: ${(p) => p.theme.colors.text.primary};

  strong {
    color: ${(p) => p.theme.colors.text.secondary};
    font-weight: 600;
  }
`

export const LaserRangeInput = styled.input.attrs({ type: 'range' })`
  width: 100%;
`
