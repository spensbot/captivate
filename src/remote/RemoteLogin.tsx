import { useState } from 'react'
import styled from 'styled-components'
import { TextField, Button } from '@mui/material'

export default function RemoteLogin({
  onConnect,
  error,
}: {
  onConnect: (url: string, pin: string) => void
  error: string
}) {
  const defaultUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : ''
  const [url, setUrl] = useState(defaultUrl)
  const [pin, setPin] = useState('')

  return (
    <LoginRoot>
      <LoginCard>
        <Title>Captivate Remote</Title>
        <Hint>Connect to the show computer on the same Wi‑Fi / LAN.</Hint>
        <TextField
          label="Show computer URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          fullWidth
          size="small"
          margin="dense"
        />
        <TextField
          label="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          fullWidth
          size="small"
          margin="dense"
          inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
        />
        {error.length > 0 ? <ErrorLine>{error}</ErrorLine> : null}
        <Button
          variant="contained"
          fullWidth
          onClick={() => onConnect(url.trim(), pin.trim())}
          disabled={url.trim().length === 0 || pin.trim().length < 4}
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
  box-sizing: border-box;
`

const LoginCard = styled.div`
  width: min(420px, 100%);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1.25rem;
  border-radius: 0.5rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.primary};
`

const Title = styled.h1`
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: ${(p) => p.theme.colors.text.primary};
`

const Hint = styled.p`
  margin: 0;
  font-size: 0.78rem;
  color: ${(p) => p.theme.colors.text.secondary};
  line-height: 1.4;
`

const ErrorLine = styled.div`
  font-size: 0.75rem;
  color: #ffb4b4;
`
