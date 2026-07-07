import { useState, type ReactNode } from 'react'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import IconButton from '@mui/material/IconButton'
import Popover from '@mui/material/Popover'
import styled from 'styled-components'

export const HELP_POPOVER_PAPER_SX = {
  maxWidth: '22rem',
  p: 1.25,
  lineHeight: 1.45,
  fontSize: '0.78rem',
} as const

export const HelpTitle = styled.div`
  font-size: 0.82rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
  color: ${(p) => p.theme.colors.text.primary};
`

export const HelpIntro = styled.p`
  margin: 0 0 0.5rem;
  font-size: 0.78rem;
  line-height: 1.45;
  color: ${(p) => p.theme.colors.text.secondary};
`

export const HelpBody = styled.p`
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: ${(p) => p.theme.colors.text.secondary};
`

export const HelpList = styled.ul`
  margin: 0;
  padding-left: 1.1rem;
  color: ${(p) => p.theme.colors.text.secondary};

  li + li {
    margin-top: 0.4rem;
  }
`

export const PopupTitleRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex: 1;
`

type SectionHelpButtonProps = {
  ariaLabel: string
  children: ReactNode
  anchorHorizontal?: 'left' | 'right'
  iconSize?: string
}

export default function SectionHelpButton({
  ariaLabel,
  children,
  anchorHorizontal = 'left',
  iconSize = '1rem',
}: SectionHelpButtonProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const open = anchor !== null

  return (
    <>
      <IconButton
        size="small"
        aria-label={ariaLabel}
        onClick={(e) => setAnchor(e.currentTarget)}
        onMouseDown={(e) => e.stopPropagation()}
        sx={{
          padding: '0.12rem',
          color: 'text.primary',
          '&:hover': { color: 'text.primary' },
        }}
      >
        <InfoOutlined sx={{ fontSize: iconSize }} />
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: anchorHorizontal,
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: anchorHorizontal,
        }}
        slotProps={{ paper: { sx: HELP_POPOVER_PAPER_SX } }}
      >
        {children}
      </Popover>
    </>
  )
}

export function FieldHelpButton({
  ariaLabel,
  children,
  anchorHorizontal = 'left',
}: {
  ariaLabel: string
  children: ReactNode
  anchorHorizontal?: 'left' | 'right'
}) {
  return (
    <SectionHelpButton
      ariaLabel={ariaLabel}
      anchorHorizontal={anchorHorizontal}
      iconSize="0.95rem"
    >
      <HelpBody>{children}</HelpBody>
    </SectionHelpButton>
  )
}
