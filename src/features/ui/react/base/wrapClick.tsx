import { MouseEvent } from "react"

interface Options {
  obeyPreventDefault?: boolean, 
  intercept?: boolean
}

type WrapClick = (onClick: (e: MouseEvent) => void, options?: Options) => (e: MouseEvent) => void

const wrapClick: WrapClick = (onClick, {obeyPreventDefault = true, intercept = true} = {}) => (e) => {
  if (e.defaultPrevented) {
    if (!obeyPreventDefault) onClick(e)
  } else {
    if (intercept) e.preventDefault()
    onClick(e)
  }
}

const onClickIntercept = wrapClick(() => {})

export default wrapClick
export { onClickIntercept }