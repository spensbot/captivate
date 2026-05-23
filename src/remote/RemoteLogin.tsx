import { useState } from 'react'
import styled from 'styled-components'
import captivateLogo from '../renderer/images/Thick.png'
import RemoteUiModeToggle from './RemoteUiModeToggle'
import { useRemoteUiMode } from './RemoteUiModeContext'

export default function RemoteLogin({
  onConnect,
  error,
}: {
  onConnect: (pin: string) => void
  error: string
}) {
  const { isMobile } = useRemoteUiMode()
  const [pin, setPin] = useState('')

  const canConnect = pin.trim().length >= 4

  return (
    <LoginRoot>
      <TopBar>
        <RemoteUiModeToggle />
      </TopBar>
      <LoginStack $mobile={isMobile}>
        <BrandBlock $mobile={isMobile}>
          <Logo src={captivateLogo} alt="" />
          <BrandText>
            <AppTitle>Captivate</AppTitle>
            <AppSubtitle>Remote</AppSubtitle>
          </BrandText>
        </BrandBlock>
        <LoginCard $mobile={isMobile}>
          <CardTitle $mobile={isMobile}>Enter show PIN</CardTitle>
          <Hint $mobile={isMobile}>
            Open Connections on the show computer to view the PIN, then connect on
            the same Wi‑Fi or LAN.
          </Hint>
          <Field>
            <FieldLabel htmlFor="remote-pin">PIN</FieldLabel>
            <PinInput
              id="remote-pin"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit PIN"
              value={pin}
              maxLength={8}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canConnect) {
                  onConnect(pin.trim())
                }
              }}
            />
          </Field>
          {error.length > 0 ? <ErrorLine>{error}</ErrorLine> : null}
          <ConnectButton
            type="button"
            $mobile={isMobile}
            disabled={!canConnect}
            onClick={() => onConnect(pin.trim())}
          >
            Connect
          </ConnectButton>
        </LoginCard>
      </LoginStack>
    </LoginRoot>
  )
}

const LoginRoot = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 1.25rem 1rem 2rem;
  box-sizing: border-box;
  background: linear-gradient(
    165deg,
    ${(p) => p.theme.colors.bg.darker} 0%,
    ${(p) => p.theme.colors.bg.primary} 42%,
    ${(p) => p.theme.colors.bg.darker} 100%
  );
`

const TopBar = styled.div`
  position: absolute;
  top: max(0.65rem, env(safe-area-inset-top, 0px));
  right: max(0.65rem, env(safe-area-inset-right, 0px));
  z-index: 2;
`

const LoginStack = styled.div<{ $mobile: boolean }>`
  width: min(${(p) => (p.$mobile ? '100%' : '24rem')}, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${(p) => (p.$mobile ? '1.15rem' : '1.35rem')};
`

const BrandBlock = styled.div<{ $mobile: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${(p) => (p.$mobile ? '0.55rem' : '0.65rem')};
  text-align: center;
`

const Logo = styled.img`
  width: 5.5rem;
  height: 5.5rem;
  object-fit: contain;
  filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.55));
`

const BrandText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.12rem;
`

const AppTitle = styled.h1`
  margin: 0;
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: ${(p) => p.theme.colors.text.primary};
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
`

const AppSubtitle = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #78dc82;
`

const LoginCard = styled.div<{ $mobile: boolean }>`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${(p) => (p.$mobile ? '0.85rem' : '0.75rem')};
  padding: ${(p) => (p.$mobile ? '1.35rem' : '1.25rem')};
  border-radius: 0.55rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  background: linear-gradient(
    180deg,
    ${(p) => p.theme.colors.bg.panel} 0%,
    ${(p) => p.theme.colors.bg.primary} 100%
  );
  box-shadow:
    ${(p) => p.theme.elevation.insetHighlight},
    ${(p) => p.theme.elevation.shadowMd};
`

const CardTitle = styled.h2<{ $mobile: boolean }>`
  margin: 0;
  font-size: ${(p) => (p.$mobile ? '1.05rem' : '0.95rem')};
  font-weight: 700;
  color: ${(p) => p.theme.colors.text.primary};
`

const Hint = styled.p<{ $mobile: boolean }>`
  margin: 0;
  font-size: ${(p) => (p.$mobile ? '0.88rem' : '0.78rem')};
  color: ${(p) => p.theme.colors.text.secondary};
  line-height: 1.45;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const FieldLabel = styled.label`
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${(p) => p.theme.colors.text.secondary};
`

const PinInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  min-height: 2.85rem;
  padding: 0.55rem 0.75rem;
  border-radius: 0.35rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.darker};
  color: ${(p) => p.theme.colors.text.primary};
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-align: center;
  box-shadow: ${(p) => p.theme.elevation.insetDepth};

  &::placeholder {
    color: ${(p) => p.theme.colors.text.secondary};
    letter-spacing: 0.04em;
    font-weight: 500;
  }

  &:focus {
    outline: none;
    border-color: #78dc82;
    box-shadow:
      ${(p) => p.theme.elevation.insetDepth},
      0 0 0 2px rgba(120, 220, 130, 0.25);
  }
`

const ErrorLine = styled.div`
  font-size: 0.8rem;
  color: #ffb4b4;
  line-height: 1.35;
`

const ConnectButton = styled.button<{ $mobile: boolean }>`
  width: 100%;
  min-height: ${(p) => (p.$mobile ? '3rem' : '2.65rem')};
  margin-top: 0.15rem;
  border: 1px solid #5a9a62;
  border-radius: 0.4rem;
  background: linear-gradient(180deg, #5ecf6c 0%, #3d9a4a 100%);
  color: #0b140e;
  font-size: ${(p) => (p.$mobile ? '1rem' : '0.92rem')};
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow:
    ${(p) => p.theme.elevation.insetHighlight},
    ${(p) => p.theme.elevation.shadowMd};

  &:hover:not(:disabled) {
    background: linear-gradient(180deg, #72e07e 0%, #48ad56 100%);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }
`
