export const createDisposer = () => {
  const disposer = {
    _disposeables: [] as { dispose(): void }[],
    push<T extends { dispose(): void }>(disposeable: T) {
      disposer._disposeables.push(disposeable)
      return disposeable
    },
    dispose() {
      disposer._disposeables.forEach((disposeable) => {
        disposeable.dispose()
      })
      disposer._disposeables = []
    },
  }

  return disposer;
}
