import { useTypedSelector } from 'renderer/redux/store'
import styled from 'styled-components'
import zIndexes from '../zIndexes'
import Devices from './Devices'
import NewProjectDialog from './NewProjectDialog'
import AppModal from './AppModal'
import { resolveActiveAppDialog } from './appDialogService'
import AboutModal from './AboutModal'
import { useDispatch } from 'react-redux'
import { setAboutOpen, setConnectionsMenu } from '../redux/guiSlice'

interface Props {}

export default function FullscreenOverlay({}: Props) {
  const dispatch = useDispatch()
  const connectionsMenu = useTypedSelector((state) => state.gui.connectionMenu)
  const newProjectDialog = useTypedSelector(
    (state) => state.gui.newProjectDialog
  )
  const appDialog = useTypedSelector((state) => state.gui.appDialog)
  const aboutOpen = useTypedSelector((state) => state.gui.aboutOpen)

  if (!connectionsMenu && !newProjectDialog && appDialog === null && !aboutOpen) {
    return null
  }

  return (
    <Root>
      {connectionsMenu && (
        <AppModal
          open={true}
          title="Connections"
          maxWidth="72rem"
          onClose={() => dispatch(setConnectionsMenu(false))}
          actions={[
            {
              label: 'Close',
              onClick: () => dispatch(setConnectionsMenu(false)),
            },
          ]}
        >
          <Devices embedded={true} />
        </AppModal>
      )}
      {newProjectDialog && <NewProjectDialog />}
      {appDialog !== null && (
        <AppModal
          open={true}
          title={appDialog.title}
          message={appDialog.message}
          actions={[
            ...(appDialog.cancelLabel !== undefined && appDialog.cancelLabel.length > 0
              ? [
                  {
                    label: appDialog.cancelLabel,
                    onClick: () => resolveActiveAppDialog(false),
                  },
                ]
              : []),
            {
              label: appDialog.confirmLabel ?? 'OK',
              tone: appDialog.danger === true ? 'danger' : 'default',
              onClick: () => resolveActiveAppDialog(true),
            },
          ]}
        />
      )}
      <AboutModal
        open={aboutOpen}
        onClose={() => dispatch(setAboutOpen(false))}
      />
    </Root>
  )
}

const Root = styled.div`
  z-index: ${zIndexes.fullscreenOverlay};
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
`
