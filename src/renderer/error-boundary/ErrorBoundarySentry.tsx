import React from 'react'
import * as Sentry from '@sentry/react'
import ErrorBoundaryFallback from './ErrorBoundaryFallback'
import debounce from 'lodash.debounce'

const MIN_TIME_BETWEEN_DIALOGS = 5000 // ms

let showDialog = debounce(() => {
  Sentry.showReportDialog()
}, MIN_TIME_BETWEEN_DIALOGS)

export default function ErrorBoundarySentry({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Sentry.ErrorBoundary
      showDialog={false}
      onError={(_err) => {
        showDialog()
      }}
      fallback={({ resetError }) => (
        <ErrorBoundaryFallback resetError={resetError} />
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}
