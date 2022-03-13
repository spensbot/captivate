import { useDispatch } from 'react-redux'
import AddIcon from '@mui/icons-material/Add'
import { addModulator } from '../redux/controlSlice'

export default function NewModulator() {
  const dispatch = useDispatch()

  return (
    <div
      style={{
        width: 200,
        alignSelf: 'stretch',
        backgroundColor: '#fff1',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        minHeight: '10rem',
      }}
      onClick={() => dispatch(addModulator())}
    >
      <AddIcon />
    </div>
  )
}
