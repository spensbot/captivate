import React from 'React'
import { useDispatch } from 'react-redux';
import { ParamKey } from '../engine/params';
import { useTypedSelector } from '../redux/store'
import { setModulation } from '../redux/paramsSlice'


export default function ModulationMatrix() {

  const paramsModulation = useTypedSelector(state => state.params.modulation)
  const modulators = useTypedSelector(state => state.modulators)
  const dispatch = useDispatch()

  const styles: { [key: string]: React.CSSProperties } = {
    table: {
      margin: '1rem',
      border: '1px solid black',
      borderCollapse: 'collapse',
    },
    activeCell: {
      width: '1rem',
      height: '1rem',
      margin: '0.2rem',
      backgroundColor: '#fff8',
    },
    cell: {
      width: '1rem',
      height: '1rem',
      margin: '0.2rem'
    }
  }

  function setParamModulation(param: ParamKey, modulatorIndex: number | null) {
    return () => {
      dispatch(setModulation({param: param, modulatorIndex: modulatorIndex}))
    }
  }

  function getRow([param, modulatorIndex]: [ParamKey, number | null]) {
    const paramMods = Array(modulators.length).fill(false)
    if (modulatorIndex !== null) paramMods[modulatorIndex] = true

    return (
      <tr key={param}>
        <td>{param}</td>
        {paramMods.map((isModded, index) => {
          return (
            <td key={index}>
              <div
                onClick={setParamModulation(param, isModded ? null : index)}
                style={isModded ? styles.activeCell : styles.cell}
              ></div>
            </td>
          )
        })}
      </tr>
    )
  }

  return (
    <table style={styles.table}>
      <tr>
        <th><span></span></th> <th>0</th> <th>1</th>
      </tr>
      {Object.entries(paramsModulation).map(getRow)}
    </table>
  )
}