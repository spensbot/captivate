import { IconButton } from '@mui/material'
import ArrowDown from '@mui/icons-material/ArrowDropDown'
import ArrowRight from '@mui/icons-material/ArrowRight'

interface Props {
  isOpen: boolean
  onClick: () => void
  title?: string
}

export default function Dropdown({
  isOpen,
  onClick,
  title = 'Toggle section',
}: Props) {
  return (
    <IconButton onClick={onClick} title={title} aria-label={title}>
      {isOpen ? <ArrowDown /> : <ArrowRight />}
    </IconButton>
  )
}
