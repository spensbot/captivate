import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import {
  getLocalDirectories,
  getProjectMBridgeStatus,
  installProjectMBinaries,
  listProjectMPresets,
  listProjectMPresetsInDirectory,
} from '../ipcHandler'
import {
  initProjectMRuntimeDetection,
  ProjectMPresetOption,
} from '../../shared/projectm'
import { ProjectMBridgeStatus } from '../../shared/projectmBridge'
import { ProjectMConfig } from '../../visualizer/threejs/layers/ProjectM'
import AppModal from '../overlays/AppModal'
import BusyModal from '../overlays/BusyModal'
import useStandardBusy, { formatBusyDuration } from '../hooks/useStandardBusy'

interface Props {
  config: ProjectMConfig
  onChange: (newConfig: ProjectMConfig) => void
}

const PRESET_PAGE_SIZE = 200

export default function ProjectMEditor({ config, onChange }: Props) {
  const [status, setStatus] = useState<ProjectMBridgeStatus>({
    bridgeLoaded: false,
    bridgePath: null,
    runtime: initProjectMRuntimeDetection(),
    supportedTransports: [],
    message: 'Loading projectM bridge status...',
  })
  const [runtimeLoading, setRuntimeLoading] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [installMessage, setInstallMessage] = useState('')
  const [presetLoading, setPresetLoading] = useState(false)
  const [presetMessage, setPresetMessage] = useState('')
  const [presetOptions, setPresetOptions] = useState<ProjectMPresetOption[]>([])
  const [presetDirectory, setPresetDirectory] = useState(() =>
    normalizePresetDirectory(config.presetDirectory, config.preset)
  )
  const [presetModalOpen, setPresetModalOpen] = useState(false)
  const [presetModalDirectory, setPresetModalDirectory] = useState('')
  const [presetModalMessage, setPresetModalMessage] = useState('')
  const [presetModalLoading, setPresetModalLoading] = useState(false)
  const [presetModalOptions, setPresetModalOptions] = useState<ProjectMPresetOption[]>([])
  const [presetModalSelection, setPresetModalSelection] = useState('')
  const [presetPickerQuery, setPresetPickerQuery] = useState('')
  const [presetPickerPage, setPresetPickerPage] = useState(0)
  const skipNextDirectoryRefreshRef = useRef(false)
  const presetRefreshSeqRef = useRef(0)
  const presetModalRefreshSeqRef = useRef(0)
  const { busy, busyMessage, startBusy, stopBusy } = useStandardBusy()

  const filteredPresetOptions = useMemo(() => {
    const query = presetPickerQuery.trim().toLowerCase()
    if (query.length <= 0) {
      return presetOptions
    }
    return presetOptions.filter((option) =>
      option.label.toLowerCase().includes(query)
    )
  }, [presetOptions, presetPickerQuery])
  const presetPageCount = Math.max(
    1,
    Math.ceil(filteredPresetOptions.length / PRESET_PAGE_SIZE)
  )
  const safePresetPage = Math.min(
    Math.max(0, presetPickerPage),
    Math.max(0, presetPageCount - 1)
  )
  const pagedPresetOptions = filteredPresetOptions.slice(
    safePresetPage * PRESET_PAGE_SIZE,
    (safePresetPage + 1) * PRESET_PAGE_SIZE
  )
  const selectedPresetLabel =
    presetOptions.find((option) => option.path === config.preset)?.label ??
    (config.preset.trim().length > 0
      ? labelFromPresetPath(config.preset)
      : 'Runtime Default')

  const refreshRuntime = async () => {
    const busyRequestId = startBusy({
      title: 'Checking projectM Runtime',
      message: 'Detecting projectM runtime and bridge status...',
    })
    setRuntimeLoading(true)
    try {
      const result = await getProjectMBridgeStatus()
      setStatus(result)
      window.dispatchEvent(new Event('captivate:projectm-status-updated'))
    } catch (_error) {
      setStatus({
        bridgeLoaded: false,
        bridgePath: null,
        runtime: initProjectMRuntimeDetection(),
        supportedTransports: [],
        message: 'Failed to query projectM bridge status.',
      })
      window.dispatchEvent(new Event('captivate:projectm-status-updated'))
    } finally {
      setRuntimeLoading(false)
      stopBusy(busyRequestId)
    }
  }

  const handleInstall = async () => {
    const startedAt = Date.now()
    const busyRequestId = startBusy({
      title: 'Installing projectM Runtime',
      message: 'Downloading and installing projectM runtime files...',
    })
    setInstalling(true)
    setInstallMessage('')
    try {
      const result = await installProjectMBinaries()
      const durationMs = Date.now() - startedAt
      setInstallMessage(`${result.message} Completed in ${formatBusyDuration(durationMs)}.`)
    } catch (error) {
      setInstallMessage(
        error instanceof Error ? error.message : 'Failed to install projectM binaries.'
      )
    } finally {
      await refreshRuntime()
      setInstalling(false)
      stopBusy(busyRequestId)
    }
  }

  const refreshPresets = async (
    directoryOverride?: string,
    options?: { immediateBusy?: boolean }
  ) => {
    const refreshSeq = ++presetRefreshSeqRef.current
    const startedAt = Date.now()
    const busyRequestId = startBusy({
      title: 'Discovering Presets',
      message: 'Scanning projectM preset files...',
    }, { immediate: options?.immediateBusy === true })
    setPresetLoading(true)
    try {
      const selectedDirectory =
        typeof directoryOverride === 'string' ? directoryOverride.trim() : ''
      const result =
        selectedDirectory.length > 0
          ? await listProjectMPresetsInDirectory(selectedDirectory)
          : await listProjectMPresets()
      if (refreshSeq !== presetRefreshSeqRef.current) {
        return null
      }
      setPresetOptions(result.presets)
      const durationMs = Date.now() - startedAt
      setPresetMessage(
        `${result.message} Completed in ${formatBusyDuration(durationMs)}.`
      )
      return result
    } catch (error) {
      if (refreshSeq !== presetRefreshSeqRef.current) {
        return null
      }
      setPresetMessage(
        error instanceof Error ? error.message : 'Failed to load projectM presets.'
      )
      setPresetOptions([])
      return null
    } finally {
      if (refreshSeq === presetRefreshSeqRef.current) {
        setPresetLoading(false)
      }
      stopBusy(busyRequestId)
    }
  }

  const loadPresetDirectoryPreview = async (
    directoryPath: string,
    preferredPresetPath: string
  ) => {
    const refreshSeq = ++presetModalRefreshSeqRef.current
    const trimmedDirectory = directoryPath.trim()
    if (trimmedDirectory.length <= 0) {
      setPresetModalOptions([])
      setPresetModalSelection('')
      setPresetModalMessage('Select a preset directory to preview .milk/.prjm presets.')
      return
    }
    const startedAt = Date.now()
    const busyRequestId = startBusy({
      title: 'Scanning Preset Directory',
      message: 'Reading projectM presets from the selected folder...',
    }, { immediate: true })
    setPresetModalLoading(true)
    try {
      const result = await listProjectMPresetsInDirectory(trimmedDirectory)
      if (refreshSeq !== presetModalRefreshSeqRef.current) {
        return
      }
      setPresetModalOptions(result.presets)
      const durationMs = Date.now() - startedAt
      setPresetModalMessage(
        `${result.message} Completed in ${formatBusyDuration(durationMs)}.`
      )
      const fallbackSelection = result.presets[0]?.path ?? ''
      const nextSelection = result.presets.some(
        (option) => option.path === preferredPresetPath
      )
        ? preferredPresetPath
        : fallbackSelection
      setPresetModalSelection(nextSelection)
    } catch (error) {
      if (refreshSeq !== presetModalRefreshSeqRef.current) {
        return
      }
      setPresetModalOptions([])
      setPresetModalSelection('')
      setPresetModalMessage(
        error instanceof Error
          ? error.message
          : 'Failed to load presets from the selected directory.'
      )
    } finally {
      if (refreshSeq === presetModalRefreshSeqRef.current) {
        setPresetModalLoading(false)
      }
      stopBusy(busyRequestId)
    }
  }

  const handleOpenPresetDirectoryModal = () => {
    setPresetModalOpen(true)
    setPresetModalDirectory(presetDirectory)
    setPresetModalSelection(config.preset)
    void loadPresetDirectoryPreview(presetDirectory, config.preset)
  }

  const handleChoosePresetDirectory = async () => {
    try {
      const directories = await getLocalDirectories('Select projectM preset directory')
      const selected = directories[0]
      if (typeof selected !== 'string' || selected.trim().length <= 0) {
        return
      }
      setPresetModalDirectory(selected)
      await loadPresetDirectoryPreview(selected, presetModalSelection || config.preset)
    } catch (_error) {
      // User cancelled.
    }
  }

  const handleApplyPresetDirectory = () => {
    const selectedDirectory = presetModalDirectory.trim()
    skipNextDirectoryRefreshRef.current = true
    setPresetDirectory(selectedDirectory)
    setPresetOptions(presetModalOptions)
    setPresetMessage(presetModalMessage)
    const selectedPresetPath =
      presetModalOptions.some((option) => option.path === presetModalSelection)
        ? presetModalSelection
        : presetModalOptions.some((option) => option.path === config.preset)
        ? config.preset
        : presetModalOptions[0]?.path ?? ''
    if (
      selectedPresetPath !== config.preset ||
      selectedDirectory !== normalizePresetDirectory(config.presetDirectory, config.preset)
    ) {
      onChange({
        ...config,
        presetDirectory: selectedDirectory,
        preset: selectedPresetPath,
      })
    }
    setPresetModalOpen(false)
  }

  useEffect(() => {
    void refreshRuntime()
  }, [])

  useEffect(() => {
    const nextDirectory = normalizePresetDirectory(config.presetDirectory, config.preset)
    setPresetDirectory((current) =>
      current === nextDirectory ? current : nextDirectory
    )
  }, [config.presetDirectory, config.preset])

  useEffect(() => {
    if (!status.runtime.available) {
      setPresetOptions([])
      setPresetMessage('')
      return
    }
    if (skipNextDirectoryRefreshRef.current) {
      skipNextDirectoryRefreshRef.current = false
      return
    }
    void refreshPresets(presetDirectory)
  }, [status.runtime.available, presetDirectory])

  const nativeAvailable = status.runtime.available
  const runtimeFoundButUnavailable =
    nativeAvailable === false && status.runtime.libraryPath !== null

  return (
    <Root>
      <Header>projectM</Header>
      {nativeAvailable ? (
        <>
          <Field>
            <Label>Preset</Label>
            <PresetRow>
              <PresetCurrent title={config.preset || 'Runtime Default'}>
                {selectedPresetLabel}
              </PresetCurrent>
              <MiniButton
                type="button"
                onClick={handleOpenPresetDirectoryModal}
                title="Select and preview a projectM preset directory"
              >
                Directory...
              </MiniButton>
              <MiniButton
                type="button"
                onClick={() => {
                  void refreshPresets(presetDirectory)
                }}
                disabled={presetLoading}
                title="Reload preset list"
              >
                {presetLoading ? '...' : 'Reload'}
              </MiniButton>
            </PresetRow>
            {presetDirectory.trim().length > 0 ? (
              <DirectoryValue title={presetDirectory}>
                Preset Directory: {presetDirectory}
              </DirectoryValue>
            ) : null}
            {presetMessage.length > 0 ? (
              <StatusLine>{presetMessage}</StatusLine>
            ) : null}
          </Field>
          <Field>
            <Label>Preset Chooser</Label>
            <PresetChooserTopRow>
              <SearchInput
                type="text"
                value={presetPickerQuery}
                placeholder="Search presets..."
                onChange={(event) => {
                  setPresetPickerQuery(event.target.value)
                  setPresetPickerPage(0)
                }}
              />
              <MiniButton
                type="button"
                onClick={() => {
                  onChange({
                    ...config,
                    preset: '',
                  })
                }}
              >
                Runtime Default
              </MiniButton>
            </PresetChooserTopRow>
            <PagerRow>
              <PagerText>
                {filteredPresetOptions.length} preset
                {filteredPresetOptions.length === 1 ? '' : 's'} found
              </PagerText>
              <PagerButtons>
                <MiniButton
                  type="button"
                  onClick={() => setPresetPickerPage((prev) => Math.max(0, prev - 1))}
                  disabled={safePresetPage <= 0}
                >
                  Prev
                </MiniButton>
                <PagerText>
                  Page {safePresetPage + 1} / {presetPageCount}
                </PagerText>
                <MiniButton
                  type="button"
                  onClick={() =>
                    setPresetPickerPage((prev) =>
                      Math.min(presetPageCount - 1, prev + 1)
                    )
                  }
                  disabled={safePresetPage >= presetPageCount - 1}
                >
                  Next
                </MiniButton>
              </PagerButtons>
            </PagerRow>
            <ModalList>
              {pagedPresetOptions.map((option) => (
                <ModalListItem key={option.path}>
                  <ModalPresetButton
                    type="button"
                    $selected={option.path === config.preset}
                    onClick={() => {
                      onChange({
                        ...config,
                        preset: option.path,
                      })
                    }}
                    title={option.path}
                  >
                    {option.label}
                  </ModalPresetButton>
                </ModalListItem>
              ))}
              {pagedPresetOptions.length === 0 && (
                <ModalEmpty>No presets match your search.</ModalEmpty>
              )}
            </ModalList>
          </Field>
          <Note>
            <StatusLine>
              Runtime: Loaded
            </StatusLine>
            <StatusLine>
              Bridge: {status.bridgeLoaded ? 'Active' : 'Compatibility Mode'}
            </StatusLine>
          </Note>
        </>
      ) : (
        <>
          <MissingPanel>
            <MissingTitle>
              {runtimeFoundButUnavailable
                ? 'projectM runtime is installed but failed to load.'
                : 'projectM runtime is not installed.'}
            </MissingTitle>
            <MissingLine>
              {runtimeFoundButUnavailable
                ? 'Try Refresh first. If it still fails, reinstall the runtime package.'
                : 'Install the projectM runtime package to enable native projectM rendering.'}
            </MissingLine>
            <InstallButton
              type="button"
              onClick={handleInstall}
              disabled={installing || runtimeLoading}
            >
              {installing ? 'Downloading and Installing Runtime...' : 'Download + Install Runtime'}
            </InstallButton>
            {installMessage.length > 0 ? (
              <InstallMessage>{installMessage}</InstallMessage>
            ) : null}
          </MissingPanel>
          <Note>
            <StatusRow>
              <StatusValue>Runtime: Not Loaded</StatusValue>
              <RefreshButton type="button" onClick={refreshRuntime} disabled={runtimeLoading}>
                {runtimeLoading ? 'Checking...' : 'Refresh'}
              </RefreshButton>
            </StatusRow>
            <StatusLine>{status.runtime.message}</StatusLine>
            {status.runtime.version !== null && (
              <StatusLine>Runtime Version: {status.runtime.version}</StatusLine>
            )}
            {status.runtime.libraryPath !== null && (
              <StatusLine title={status.runtime.libraryPath}>
                Runtime Library: {status.runtime.libraryPath}
              </StatusLine>
            )}
            <StatusLine>
              Bridge: {status.bridgeLoaded ? 'Native Addon Loaded' : 'Built-in Compatibility Mode'}
            </StatusLine>
            {status.bridgePath !== null && (
              <StatusLine title={status.bridgePath}>Bridge Path: {status.bridgePath}</StatusLine>
            )}
            {status.supportedTransports.length > 0 && (
              <StatusLine>
                Transports: {status.supportedTransports.join(', ')}
              </StatusLine>
            )}
            <StatusLine>{status.message}</StatusLine>
            <StatusLink href={status.runtime.downloadUrl} target="_blank" rel="noreferrer">
              Runtime Download (Official projectM)
            </StatusLink>
          </Note>
        </>
      )}
      <BusyModal
        open={busy !== null}
        title={busy?.title ?? 'Working...'}
        message={busyMessage}
      />
      <AppModal
        open={presetModalOpen}
        title="projectM Preset Directory"
        message="Select a folder, preview presets, then click OK to load them into the dropdown."
        maxWidth="46rem"
        onClose={() => setPresetModalOpen(false)}
        actions={[
          {
            label: 'Cancel',
            onClick: () => setPresetModalOpen(false),
          },
          {
            label: 'OK',
            onClick: handleApplyPresetDirectory,
          },
        ]}
      >
        <ModalBody>
          <ModalTopRow>
            <MiniButton type="button" onClick={handleChoosePresetDirectory}>
              Choose Folder...
            </MiniButton>
            <ModalPath title={presetModalDirectory}>
              {presetModalDirectory.trim().length > 0
                ? presetModalDirectory
                : 'No folder selected'}
            </ModalPath>
          </ModalTopRow>
          <ModalHint>
            {presetModalLoading
              ? 'Scanning presets...'
              : presetModalMessage.length > 0
              ? presetModalMessage
              : 'Select a preset directory to scan.'}
          </ModalHint>
          <ModalList>
            {presetModalOptions.map((option) => (
              <ModalListItem key={option.path}>
                <ModalPresetButton
                  type="button"
                  $selected={option.path === presetModalSelection}
                  onClick={() => setPresetModalSelection(option.path)}
                  title={option.path}
                >
                  {option.label}
                </ModalPresetButton>
              </ModalListItem>
            ))}
            {presetModalOptions.length === 0 && (
              <ModalEmpty>No presets found in this folder.</ModalEmpty>
            )}
          </ModalList>
        </ModalBody>
      </AppModal>
    </Root>
  )
}

function labelFromPresetPath(presetPath: string) {
  const normalized = typeof presetPath === 'string' ? presetPath.trim() : ''
  if (normalized.length <= 0) {
    return ''
  }
  const pathWithoutQuery = normalized.split('?')[0]
  const slashIndex = Math.max(
    pathWithoutQuery.lastIndexOf('/'),
    pathWithoutQuery.lastIndexOf('\\')
  )
  const fileName =
    slashIndex >= 0 ? pathWithoutQuery.slice(slashIndex + 1) : pathWithoutQuery
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName
}

function normalizePresetDirectory(presetDirectory: string | undefined, presetPath: string) {
  const explicit = typeof presetDirectory === 'string' ? presetDirectory.trim() : ''
  if (explicit.length > 0) {
    return explicit
  }
  const normalizedPreset = typeof presetPath === 'string' ? presetPath.trim() : ''
  if (normalizedPreset.length <= 0 || normalizedPreset.includes('://')) {
    return ''
  }
  const withoutTrailing = normalizedPreset.replace(/[\\\/]+$/, '')
  const slashIndex = Math.max(
    withoutTrailing.lastIndexOf('/'),
    withoutTrailing.lastIndexOf('\\')
  )
  if (slashIndex <= 0) {
    return ''
  }
  return withoutTrailing.slice(0, slashIndex)
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
  height: 100%;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-x: auto;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 0 0.45rem 0.65rem 0;
  scrollbar-gutter: stable both-edges;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a99 #0000;

  * {
    min-width: 0;
    box-sizing: border-box;
  }

  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
`

const Header = styled.div`
  font-size: 1rem;
  font-weight: 700;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
`

const Label = styled.div`
  font-size: 0.72rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const PresetRow = styled.div`
  display: flex;
  gap: 0.35rem;
  align-items: center;
  min-width: 0;
`

const DirectoryValue = styled.div`
  font-size: 0.68rem;
  color: ${(props) => props.theme.colors.text.secondary};
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
`

const PresetCurrent = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.25rem;
  padding: 0.32rem 0.4rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const MiniButton = styled.button`
  flex-shrink: 0;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.25rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  padding: 0.3rem 0.5rem;
  cursor: pointer;
  white-space: nowrap;
`

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`

const ModalTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  width: 100%;
`

/** Search + actions: keep the field from overflowing narrow panels (flex min-width). */
const PresetChooserTopRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0.45rem;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  flex-wrap: wrap;
`

const ModalPath = styled.div`
  min-width: 0;
  flex: 1 1 auto;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.25rem;
  padding: 0.34rem 0.45rem;
  color: ${(props) => props.theme.colors.text.secondary};
  background: ${(props) => props.theme.colors.bg.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const SearchInput = styled.input`
  min-width: 0;
  width: 0;
  flex: 1 1 8rem;
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.25rem;
  padding: 0.34rem 0.45rem;
  color: #ffffff;
  background: #000000;

  &::placeholder {
    color: rgba(255, 255, 255, 0.45);
  }

  &:disabled {
    color: rgba(255, 255, 255, 0.38);
  }
`

const PagerRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
`

const PagerButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`

const PagerText = styled.div`
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const ModalHint = styled.div`
  font-size: 0.76rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const ModalList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.35rem;
  max-height: 16rem;
  overflow: auto;
  background: #0000002b;
`

const ModalListItem = styled.li`
  margin: 0;
  padding: 0;
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
  &:last-child {
    border-bottom: none;
  }
`

const ModalPresetButton = styled.button<{ $selected: boolean }>`
  width: 100%;
  text-align: left;
  border: none;
  background: ${(props) =>
    props.$selected ? 'rgba(106, 162, 255, 0.24)' : 'transparent'};
  color: ${(props) => props.theme.colors.text.primary};
  cursor: pointer;
  padding: 0.42rem 0.52rem;
  font-size: 0.78rem;
`

const ModalEmpty = styled.div`
  padding: 0.6rem;
  font-size: 0.76rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const Note = styled.div`
  font-size: 0.72rem;
  color: ${(props) => props.theme.colors.text.secondary};
  border-top: 1px solid ${(props) => props.theme.colors.divider};
  padding-top: 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
  width: 100%;
`

const MissingPanel = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.35rem;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  background: rgba(0, 0, 0, 0.18);
  min-width: 0;
  width: 100%;
`

const MissingTitle = styled.div`
  font-size: 0.82rem;
  font-weight: 700;
`

const MissingLine = styled.div`
  font-size: 0.72rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const InstallButton = styled.button`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.26rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  padding: 0.32rem 0.5rem;
  cursor: pointer;
  text-align: left;
  width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
`

const InstallMessage = styled.div`
  font-size: 0.72rem;
  color: ${(props) => props.theme.colors.text.primary};
  line-height: 1.35;
`

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.4rem;
  flex-wrap: wrap;
  width: 100%;
  min-width: 0;
`

const StatusValue = styled.div`
  font-weight: 600;
  min-width: 0;
`

const StatusLine = styled.div`
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.3;
  width: 100%;
`

const RefreshButton = styled.button`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.25rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  padding: 0.18rem 0.45rem;
  cursor: pointer;
  max-width: 100%;
  white-space: nowrap;
`

const StatusLink = styled.a`
  color: ${(props) => props.theme.colors.text.primary};
  text-decoration: underline;
  display: block;
  width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
`
