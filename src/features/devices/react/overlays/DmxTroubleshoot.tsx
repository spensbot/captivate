import { useTypedSelector } from 'renderer/redux/store'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import CopyIcon from '@mui/icons-material/ContentCopy'
import { useState } from 'react'
import useSafeCallback from 'features/ui/react/hooks/useSafeCallback'

function copyToClipboard(text: string) {
  return navigator.clipboard.writeText(text)
}

type CopyStatus = 'success' | 'error' | null

export default function DmxTroubleshoot() {
  const serialPorts = useTypedSelector((state) => state.gui.dmx.serialports)
  const [troubleshoot, setTroubleshoot] = useState(false)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null)
  const safeSetCopyStatus = useSafeCallback((status: CopyStatus) =>
    setCopyStatus(status)
  )

  return (
    <Root>
      <Divider style={{ height: '1px' }} />
      <Row>
        {troubleshoot && (
          <IconButton
            onClick={() => {
              copyToClipboard(JSON.stringify(serialPorts))
                .then(() => safeSetCopyStatus('success'))
                .catch(() => safeSetCopyStatus('error'))
              setTimeout(() => safeSetCopyStatus(null), 700)
            }}
            style={{ marginRight: '0.5rem' }}
          >
            <CopyIcon />
          </IconButton>
        )}
        <div style={{ flex: '1 0 0' }}>
          {copyStatus === 'success'
            ? 'Copied :)'
            : copyStatus === 'error'
            ? 'copy failed :/'
            : ''}
        </div>
        <TSButton onClick={() => setTroubleshoot(!troubleshoot)}>
          Troubleshoot {troubleshoot ? '▲' : '▼'}
        </TSButton>
      </Row>
      {troubleshoot && <div style={{ height: '0.5rem' }} />}
      {troubleshoot && (
        <Ports>
          {serialPorts.map((port) => (
            <Port>
              Path: {port.path}
              {portInfo('Location: ', port.locationId)}
              {portInfo('Manufacturer: ', port.manufacturer)}
              {portInfo('Pnp Id: ', port.pnpId)}
              {portInfo('Product Id: ', port.productId)}
              {portInfo('Serial Number: ', port.serialNumber)}
              {portInfo('Vendor Id: ', port.vendorId)}
            </Port>
          ))}
        </Ports>
      )}
    </Root>
  )
}

function portInfo(title: string, val?: string) {
  if (val === undefined) return null
  return (
    <PortInfoRoot>
      {title}: {val}
    </PortInfoRoot>
  )
}

const Root = styled.div`
  margin: 0 1rem 0.5rem 1rem;
  max-width: 30rem;
`

const Ports = styled.div`
  user-select: text;
`

const Port = styled.div`
  margin-bottom: 0.5rem;
`

const PortInfoRoot = styled.div`
  font-size: 0.8rem;
  margin-left: 1rem;
  color: ${(props) => props.theme.colors.text.secondary};
  overflow: scroll;
`

const TSButton = styled.div`
  cursor: pointer;
  text-align: right;
  color: #fff;
  opacity: 0.4;
  padding: 0.5rem 0;
  :hover {
    opacity: 0.6;
  }
`

const Divider = styled.div`
  background-color: ${(props) => props.theme.colors.divider};
  height: 1px;
  margin: 0 0 0.5rem 0;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
`
