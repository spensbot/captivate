import { createPortal } from 'react-dom'

type Props = {
  children: React.ReactNode
}

/**
 * Renders children on `document.body` so `position: fixed` overlays cover the
 * full window. Without this, modals inside split-pane columns only cover that column
 * (e.g. fixture mapping handles on the right stay visible above a left-panel wizard).
 */
export default function OverlayPortal({ children }: Props) {
  if (typeof document === 'undefined') {
    return null
  }
  return createPortal(children, document.body)
}
