import styled from 'styled-components'
import { setSelected } from 'renderer/redux/controlSlice'
import { useDispatch } from 'react-redux'
import { useControlSelector } from '../redux/store'
import { setName } from '../redux/controlSlice'

type DropdownProps = {
  results: any
  title?: string
}

export const Menu = ({ results = ['Scenes loading'] }: DropdownProps) => {
  const handleClick = (action: string) => {
    dispatch(setSelected(action))
    dispatch(setName(action))
  }

  const dispatch = useDispatch()
  const isSelected = useControlSelector(
    (control: any) => control['light'].selected
  )

  return (
    <StyledUl>
      <DropDownLi>
        <Dropbtn onClick={() => handleClick('DropDown')}>{isSelected}</Dropbtn>
        <DropDownContent>
          <SubA onClick={() => handleClick('none')}>none</SubA>
          {results.map((el: any) => (
            <SubA onClick={() => handleClick(el[1].name)}>{el[1].name}</SubA>
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
