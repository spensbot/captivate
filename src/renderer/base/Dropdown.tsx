import styled from 'styled-components'
import { setLedFxName, setSelected } from 'renderer/redux/controlSlice'
import { useDispatch } from 'react-redux'
import { useControlSelector } from '../redux/store'

type DropdownProps = {
  results: any
  title?: string
}

export const Menu = ({ results = ['Scenes loading'] }: DropdownProps) => {
  const handleClick = (action: string) => {
    dispatch(setSelected(action))
    dispatch(setLedFxName(action))
  }
  const dispatch = useDispatch()
  dispatch(setSelected('Select a scene ↓'))

  const isSelected = useControlSelector(
    (control: any) => control['light'].selected
  )

  return (
    <StyledUl>
      <DropDownLi>
        <Dropbtn onClick={() => handleClick('DropDown')}>{isSelected}</Dropbtn>
        <DropDownContent>
          <SubA onClick={() => handleClick('none')}>none</SubA>
          {results[0] !== 'none' &&
            results.map((el: any) => (
              <SubA onClick={() => handleClick(el[0])}>{el[0]}</SubA>
            ))}
        </DropDownContent>
      </DropDownLi>
    </StyledUl>
  )
}

const StyledUl = styled.ul`
  width: 100%;
  justify-content: center;
  list-style-type: none;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: #333;
  font-size: 1rem;
`

const StyledLi = styled.li`
  width: inherit;
  text-align: center;
  float: left;
`

const Dropbtn = styled.div`
  display: inline-block;
  color: white;
  text-align: center;
  padding: 14px 16px;
  text-decoration: none;
`

const DropDownContent = styled.div`
  display: none;
  position: absolute;
  background-color: hsl(0, 0%, 15%);
  min-width: 160px;
  width: 40%;
  box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
  z-index: 1;
`

const DropDownLi = styled(StyledLi)`
  display: inline-block;
  width: 100%;
  &:hover {
    background-color: #42aafe;
  }
  &:hover ${DropDownContent} {
    display: block;
  }
`

const SubA = styled.a`
  color: white;

  padding: 12px 16px;
  text-decoration: none;
  display: block;
  text-align: left;
  &:hover {
    color: black;
    background-color: #90caf9;
  }
`
export default Menu
