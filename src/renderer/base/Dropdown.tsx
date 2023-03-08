import { IconButton } from '@mui/material'
import ArrowDown from '@mui/icons-material/ArrowDropDown'
import ArrowRight from '@mui/icons-material/ArrowRight'

interface Props {
  isOpen: boolean
  onClick: () => void
}

export default function Dropdown({ isOpen, onClick }: Props) {
  return (
    <IconButton onClick={onClick}>
      {isOpen ? <ArrowDown /> : <ArrowRight />}
    </IconButton>
  )
}
