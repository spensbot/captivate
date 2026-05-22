import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'

export interface LaserFb4BeyondInfoDialogProps {
  open: boolean
  onClose: () => void
}

export default function LaserFb4BeyondInfoDialog({
  open,
  onClose,
}: LaserFb4BeyondInfoDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Pangolin FB4 &amp; BEYOND setup</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" paragraph>
          Captivate drives FB4 hardware through the official{' '}
          <strong>Pangolin BEYOND</strong> app and <strong>BEYONDIO.dll</strong> (Windows).
          There is no direct FB4 wire protocol — BEYOND must be running and configured for your
          projectors.
        </Typography>

        <Typography variant="subtitle2" gutterBottom>
          Requirements
        </Typography>
        <List dense disablePadding>
          <ListItem disableGutters>
            <ListItemText primary="Windows (same machine as Captivate main process)" />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText primary="Pangolin BEYOND installed and launched before Connect" />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText primary="BEYONDIO.dll from your BEYOND folder (not bundled with Captivate)" />
          </ListItem>
        </List>

        <Typography variant="subtitle2" gutterBottom sx={{ mt: 1.5 }}>
          Steps
        </Typography>
        <List dense disablePadding>
          <ListItem disableGutters>
            <ListItemText primary="1. Start BEYOND and load your show / FB4 network setup." />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText primary='2. Connection type: "Pangolin FB4 — BEYOND".' />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText primary="3. Target: leave empty to auto-search, or paste the full path to BEYONDIO.dll." />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText primary="4. Configure projection zones — zone order = BEYOND zone index (0, 1, 2…)." />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText primary="5. Assign fixtures to zones, Connect, then arm safety to stream." />
          </ListItem>
        </List>

        <Typography variant="subtitle2" gutterBottom sx={{ mt: 1.5 }}>
          Environment
        </Typography>
        <Typography variant="body2" component="p">
          <code>CAPTIVATE_BEYOND_SDK_DLL</code> — full path to BEYONDIO.dll if auto-search fails.
        </Typography>

        <Typography variant="subtitle2" gutterBottom sx={{ mt: 1.5 }}>
          Troubleshooting
        </Typography>
        <List dense disablePadding>
          <ListItem disableGutters>
            <ListItemText
              primary="BEYONDIO.dll not found"
              secondary="Set Target or CAPTIVATE_BEYOND_SDK_DLL."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="BEYOND is not ready"
              secondary="Wait until BEYOND is fully loaded, then Connect again."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="No laser output"
              secondary="Use FB4 QS/Ethernet in BEYOND; ILDA daughterboard is pass-through only."
            />
          </ListItem>
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
