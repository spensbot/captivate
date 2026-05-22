import { useState } from 'react'
import styled from 'styled-components'
import { TextField, Button } from '@mui/material'
import RemoteUiModeToggle from './RemoteUiModeToggle'
import { useRemoteUiMode } from './RemoteUiModeContext'

export default function RemoteLogin({
  onConnect,
  error,
}: {
  onConnect: (url: string, pin: string) => void
  error: string
}) {
  const { isMobile } = useRemoteUiMode()
  const defaultUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : ''
  const [url, setUrl] = useState(defaultUrl)
  const [pin, setPin] = useState('')

  return (
    <LoginRoot>
      <LoginCard $mobile={isMobile}>
        <LoginHeader>
          <Title $mobile={isMobile}>Captivate Remote</Title>
          <RemoteUiModeToggle />
        </LoginHeader>
        <Hint $mobile={isMobile}>
          Connect to the show computer on the same Wi‑Fi / LAN.
        </Hint>
        <TextField
          label="Show computer URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          fullWidth
          size={isMobile ? 'medium' : 'small'}
          margin="dense"
        />
        <TextField
          label="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          fullWidth
          size={isMobile ? 'medium' : 'small'}
          margin="dense"
          inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
        />
        {error.length > 0 ? <ErrorLine $mobile={isMobile}>{error}</ErrorLine> : null}
        <Button
          variant="contained"
          fullWidth
          size={isMobile ? 'large' : 'medium'}
          onClick={() => onConnect(url.trim(), pin.trim())}
          disabled={url.trim().length === 0 || pin.trim().length < 4}
          sx={isMobile ? { minHeight: '3rem', fontSize: '1rem' } : undefined}
        >
          Connect
        </Button>
      </LoginCard>
    </LoginRoot>
  )
}

const LoginRoot = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  min-height: 100vh;
  min-height: 100dvh;
  box-sizing: border-box;

  [data-remote-ui-mode='mobile'] & {
    padding: 1.25rem 1rem 2rem;
    align-items: flex-start;
    padding-top: max(1.25rem, env(safe-area-inset-top, 0px));
  }
`

const LoginCard = styled.div<{ $mobile: boolean }>`
  width: min(${(p) => (p.$mobile ? '100%' : '420px')}, 100%);
  display: flex;
  flex-direction: column;
  gap: ${(p) => (p.$mobile ? '0.85rem' : '0.65rem')};
  padding: ${(p) => (p.$mobile ? '1.35rem' : '1.25rem')};
  border-radius: ${(p) => (p.$mobile ? '0.65rem' : '0.5rem')};
  border: 1px solid ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.primary};
`

const LoginHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`

const Title = styled.h1<{ $mobile: boolean }>`
  margin: 0;
  font-size: ${(p) => (p.$mobile ? '1.35rem' : '1.15rem')};
  font-weight: 700;
  color: ${(p) => p.theme.colors.text.primary};
`

const Hint = styled.p<{ $mobile: boolean }>`
  margin: 0;
  font-size: ${(p) => (p.$mobile ? '0.9rem' : '0.78rem')};
  color: ${(p) => p.theme.colors.text.secondary};
  line-height: 1.45;
`

const ErrorLine = styled.div<{ $mobile: boolean }>`
  font-size: ${(p) => (p.$mobile ? '0.85rem' : '0.75rem')};
  color: #ffb4b4;
`
