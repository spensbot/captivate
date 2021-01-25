import React from 'React'
import { useTypedSelector } from '../redux/store'

export default function ModulationMatrix() {

  const params = useTypedSelector(state => state.params);

  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      display: 'grid',
      gridTemplateColumns: '100px 30px 30px 30px 30px',
      gridTemplateRows: '30px 30px 30px',
      gap: '0.2rem 0.2rem',
      placeItems: 'center'
    },
    activeCell: {
      width: '20px',
      height: '20px',
      backgroundColor: '#fff8',
    }
  }

  return (
    <table>
      <tr>
        <th></th> <th>0</th> <th>1</th>
      </tr>
      <tr>
        <td>Hue</td> <td></td> <td></td> 
      </tr>
      <tr>
        <td>Saturation</td> <td></td> <td></td> 
      </tr>
      <tr>
        <td>Brightness</td> <td></td> <td></td> 
      </tr>
    </table>
  )
}