import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import { setLedFxName, setSelected } from 'renderer/redux/controlSlice'
import { useDispatch } from 'react-redux'
import { useControlSelector } from '../redux/store'

type MuiDropdownProps = {
  results: any
}

const SelectVariants = ({ results }: MuiDropdownProps) => {
  const dispatch = useDispatch()

  const handleChange = (event: SelectChangeEvent) => {
    dispatch(setSelected(event.target.value))
    dispatch(setLedFxName(event.target.value))
  }

  const isSelected = useControlSelector(
    (control: any) => control['light'].selected
  )
  const url = useControlSelector((control: any) => control['light'].url)

  return (
    <div>
      <FormControl
        sx={{ m: 1, minWidth: 120, zindex: 20000, width: 500 }}
        fullWidth={true}
      >
        <InputLabel id="demo-simple-select-filled-label">
          Select a scene
        </InputLabel>
        <Select
          labelId="demo-simple-select-filled-label"
          id="demo-simple-select-filled"
          value={isSelected}
          label="Select a scene"
          // @ts-ignore
          onChange={handleChange}
          sx={{ zindex: 20000 }}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {results &&
            results[0] !== 'none' &&
            url.length > 8 &&
            results.map((el: any) => (
              <MenuItem value={el[0]}>{el[0]}</MenuItem>
            ))}
        </Select>
      </FormControl>
    </div>
  )
}

export default SelectVariants
