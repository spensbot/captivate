import { useEffect } from 'react'

const INTERACTIVE_SELECTOR = [
  'button',
  '[role="button"]',
  '[role="slider"]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'input[type="range"]',
  '.MuiButtonBase-root',
  '.MuiSlider-root',
  '.MuiIconButton-root',
].join(',')

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function fromAriaLabelledBy(el: HTMLElement): string {
  const labelledBy = normalizeText(el.getAttribute('aria-labelledby'))
  if (!labelledBy) return ''
  const pieces = labelledBy
    .split(/\s+/)
    .map((id) => normalizeText(document.getElementById(id)?.textContent))
    .filter((text) => text.length > 0)
  return pieces.join(' ')
}

function iconNameFallback(el: HTMLElement): string {
  const icon = el.querySelector('svg[data-testid]')
  const testId = normalizeText(icon?.getAttribute('data-testid'))
  if (!testId) return ''
  const noSuffix = testId.endsWith('Icon') ? testId.slice(0, -4) : testId
  return noSuffix
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
}

function hasManagedTooltip(el: HTMLElement): boolean {
  if (el.getAttribute('data-tooltip-skip') === 'true') {
    return true
  }
  // MUI Tooltip manages its own popper; native title would duplicate it.
  if (el.closest('.MuiTooltip-root')) {
    return true
  }
  return false
}

function inferTooltip(el: HTMLElement): string {
  const explicit = normalizeText(el.getAttribute('data-tooltip'))
  if (explicit) return explicit

  const ariaLabel = normalizeText(el.getAttribute('aria-label'))
  if (ariaLabel) return ariaLabel

  const labelledBy = fromAriaLabelledBy(el)
  if (labelledBy) return labelledBy

  const text = normalizeText(el.textContent)
  if (text) return text

  const iconFallback = iconNameFallback(el)
  if (iconFallback) return iconFallback

  const previousText = normalizeText(el.previousElementSibling?.textContent)
  if (previousText) return previousText

  const parentDataLabel = normalizeText(
    el.parentElement?.getAttribute('data-tooltip-group')
  )
  if (parentDataLabel) return parentDataLabel

  if (el.matches('input[type="range"], [role="slider"], .MuiSlider-root')) {
    return 'Adjust value'
  }

  return 'Action'
}

function applyTooltips(scope: ParentNode) {
  const controls = scope.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR)
  controls.forEach((control) => {
    applyTooltipIfMissing(control)
  })
}

function applyTooltipIfMissing(control: HTMLElement | null) {
  if (!control || hasManagedTooltip(control)) {
    return
  }
  const currentTitle = normalizeText(control.getAttribute('title'))
  if (currentTitle.length > 0) {
    return
  }
  const tooltip = inferTooltip(control)
  if (tooltip.length > 0) {
    control.setAttribute('title', tooltip)
  }
}

export default function useGlobalControlTooltips() {
  useEffect(() => {
    let disposed = false
    const scheduleInitialApply = () => {
      window.requestAnimationFrame(() => {
        if (disposed) return
        applyTooltips(document)
      })
    }
    scheduleInitialApply()

    const handleInteractiveTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return
      const control = target.closest(INTERACTIVE_SELECTOR)
      if (!(control instanceof HTMLElement)) return
      applyTooltipIfMissing(control)
    }

    const onPointerOver = (event: Event) => {
      handleInteractiveTarget(event.target)
    }
    const onFocusIn = (event: Event) => {
      handleInteractiveTarget(event.target)
    }

    document.addEventListener('pointerover', onPointerOver, true)
    document.addEventListener('focusin', onFocusIn, true)

    return () => {
      disposed = true
      document.removeEventListener('pointerover', onPointerOver, true)
      document.removeEventListener('focusin', onFocusIn, true)
    }
  }, [])
}
