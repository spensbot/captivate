// DEPRECATED IN FAVOR OF ErrorBoundarySentry

// import React from 'react'
// import ErrorBoundaryFallback from './ErrorBoundaryFallback'

// interface Props {}

// interface State {
//   error?: any
// }

// export default class ErrorBoundary extends React.Component<Props, State> {
//   constructor(props: Props) {
//     super(props)
//     this.state = {}
//   }

//   static getDerivedStateFromError(error: any) {
//     // Update state so the next render will show the fallback UI.
//     return {
//       error,
//     }
//   }

//   componentDidCatch(error: any, errorInfo: any) {
//     // You can also log the error to an error reporting service
//     console.error(error)
//     console.info(errorInfo)
//   }

//   render() {
//     if (this.state.error !== undefined) {
//       return <ErrorBoundaryFallback />
//     }

//     return this.props.children
//   }
// }
