import { useEffect, useMemo, useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import { FixtureType } from '../../shared/dmxFixtures'
import { parseFixtureLibrary } from '../../shared/fixtureLibrary'
import FixtureLibraryInfoButton from './FixtureLibraryInfoButton'
import {
  captivateFixtureLibraryContentsApiUrl,
  CAPTIVATE_FIXTURE_LIBRARY_DEFAULT_BRANCH,
  fixtureFileDisplayName,
} from '../../shared/captivateFixtureLibraryRemote'

interface Props {
  open: boolean
  onClose: () => void
  onImportFixtures: (fixtures: FixtureType[]) => void
}

interface GitHubContentItem {
  name: string
  path: string
  type: 'file' | 'dir'
  download_url: string | null
}

type GitHubFixtureFileItem = GitHubContentItem & {
  type: 'file'
  download_url: string
}

type FixtureSourceId = 'captivate' | 'qlc' | 'ofl'

type ManufacturerOption = {
  key: string
  label: string
}

type FixtureFile = {
  name: string
  path: string
  downloadUrl: string
}

const QLC_FIXTURES_API_URL =
  'https://api.github.com/repos/mcallegari/qlcplus/contents/resources/fixtures'
const OFL_FIXTURES_API_URL =
  'https://api.github.com/repos/OpenLightingProject/open-fixture-library/contents/fixtures'
const OFL_MANUFACTURERS_URL =
  'https://raw.githubusercontent.com/OpenLightingProject/open-fixture-library/master/fixtures/manufacturers.json'
const CAPTIVATE_FIXTURES_API_URL = captivateFixtureLibraryContentsApiUrl('fixtures')

const fixtureSources: { id: FixtureSourceId; label: string }[] = [
  { id: 'captivate', label: 'Captivate Community Library' },
  { id: 'qlc', label: 'QLC+ Fixture Library' },
  { id: 'ofl', label: 'Open Fixture Library' },
]

async function fetchGitHubContents(url: string): Promise<GitHubContentItem[]> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub request failed (${response.status}).`)
  }

  const payload = (await response.json()) as unknown
  if (!Array.isArray(payload)) {
    throw new Error('Unexpected GitHub response format.')
  }

  return payload as GitHubContentItem[]
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim().length > 0) {
    return err.message
  }
  return fallback
}

function manufacturerCacheKey(source: FixtureSourceId, manufacturerKey: string): string {
  return `${source}:${manufacturerKey}`
}

export default function QlcFixtureBrowserModal({
  open,
  onClose,
  onImportFixtures,
}: Props) {
  const [source, setSource] = useState<FixtureSourceId>('captivate')
  const [manufacturersBySource, setManufacturersBySource] = useState<
    Partial<Record<FixtureSourceId, ManufacturerOption[]>>
  >({})
  const [selectedManufacturerBySource, setSelectedManufacturerBySource] =
    useState<Partial<Record<FixtureSourceId, string>>>({})
  const [manufacturerSearch, setManufacturerSearch] = useState('')

  const [fixtureSearch, setFixtureSearch] = useState('')
  const [selectedFixturePath, setSelectedFixturePath] = useState('')
  const [fixturesByManufacturer, setFixturesByManufacturer] = useState<{
    [cacheKey: string]: FixtureFile[]
  }>({})

  const [isLoadingManufacturers, setIsLoadingManufacturers] = useState(false)
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [message, setMessage] = useState('')

  const manufacturers = manufacturersBySource[source] ?? []
  const selectedManufacturer = selectedManufacturerBySource[source] ?? ''
  const selectedManufacturerOption = manufacturers.find(
    (manufacturer) => manufacturer.key === selectedManufacturer
  )
  const fixtureCache = manufacturerCacheKey(source, selectedManufacturer)
  const fixturesForSelectedManufacturer =
    fixturesByManufacturer[fixtureCache] ?? []

  const selectedFixture = useMemo(
    () =>
      fixturesForSelectedManufacturer.find(
        (fixture) => fixture.path === selectedFixturePath
      ),
    [fixturesForSelectedManufacturer, selectedFixturePath]
  )

  const filteredManufacturers = useMemo(() => {
    const query = manufacturerSearch.trim().toLowerCase()
    if (query.length === 0) return manufacturers
    return manufacturers.filter((manufacturer) =>
      manufacturer.label.toLowerCase().includes(query)
    )
  }, [manufacturerSearch, manufacturers])

  const filteredFixtures = useMemo(() => {
    const query = fixtureSearch.trim().toLowerCase()
    if (query.length === 0) return fixturesForSelectedManufacturer
    return fixturesForSelectedManufacturer.filter((fixture) => {
      const displayName =
        source === 'captivate'
          ? fixtureFileDisplayName(fixture.name)
          : fixture.name
      return (
        displayName.toLowerCase().includes(query) ||
        fixture.name.toLowerCase().includes(query) ||
        fixture.path.toLowerCase().includes(query)
      )
    })
  }, [fixtureSearch, fixturesForSelectedManufacturer, source])

  const fixtureListLabel = source === 'captivate' ? 'Model' : 'Fixture File'
  const fixtureFilterPlaceholder =
    source === 'captivate' ? 'Filter by model name' : 'Filter fixture files'

  useEffect(() => {
    if (!open || manufacturers.length > 0 || isLoadingManufacturers) {
      return
    }

    void loadManufacturers(source)
  }, [open, source, manufacturers.length, isLoadingManufacturers])

  useEffect(() => {
    if (!open || selectedManufacturer.length === 0) {
      return
    }

    if (fixturesByManufacturer[fixtureCache] !== undefined) {
      return
    }

    void loadFixtures(source, selectedManufacturer)
  }, [open, source, selectedManufacturer, fixturesByManufacturer, fixtureCache])

  async function loadManufacturers(sourceId: FixtureSourceId) {
    setIsLoadingManufacturers(true)
    setMessage('')

    try {
      let nextManufacturers: ManufacturerOption[] = []

      if (sourceId === 'qlc') {
        const content = await fetchGitHubContents(QLC_FIXTURES_API_URL)
        nextManufacturers = content
          .filter((entry) => entry.type === 'dir')
          .map((entry) => ({
            key: entry.name,
            label: entry.name,
          }))
          .sort((left, right) => left.label.localeCompare(right.label))
      } else if (sourceId === 'captivate') {
        const content = await fetchGitHubContents(CAPTIVATE_FIXTURES_API_URL)
        nextManufacturers = content
          .filter((entry) => entry.type === 'dir')
          .map((entry) => ({
            key: entry.name,
            label: entry.name.replace(/-/g, ' '),
          }))
          .sort((left, right) => left.label.localeCompare(right.label))
      } else {
        const response = await fetch(OFL_MANUFACTURERS_URL)
        if (!response.ok) {
          throw new Error(`Open Fixture Library request failed (${response.status}).`)
        }

        const payload = (await response.json()) as unknown
        const record = payload as { [key: string]: unknown }
        nextManufacturers = Object.entries(record)
          .filter(([key, value]) => {
            if (key === '$schema') return false
            return value !== null && typeof value === 'object'
          })
          .map(([key, value]) => {
            const name = (value as { name?: unknown }).name
            return {
              key,
              label:
                typeof name === 'string' && name.trim().length > 0
                  ? name.trim()
                  : key,
            }
          })
          .sort((left, right) => left.label.localeCompare(right.label))
      }

      setManufacturersBySource((prev) => ({
        ...prev,
        [sourceId]: nextManufacturers,
      }))
      setSelectedManufacturerBySource((prev) => {
        const currentSelection = prev[sourceId]
        const selectionIsValid = nextManufacturers.some(
          (manufacturer) => manufacturer.key === currentSelection
        )
        return {
          ...prev,
          [sourceId]:
            selectionIsValid && currentSelection !== undefined
              ? currentSelection
              : nextManufacturers[0]?.key ?? '',
        }
      })
    } catch (err) {
      setMessage(
        `Failed to load manufacturers: ${errorMessage(err, 'Unknown error.')}`
      )
    } finally {
      setIsLoadingManufacturers(false)
    }
  }

  async function loadFixtures(
    sourceId: FixtureSourceId,
    manufacturer: string
  ) {
    setIsLoadingFixtures(true)
    setMessage('')

    try {
      const encodedManufacturer = encodeURIComponent(manufacturer)
      const baseUrl =
        sourceId === 'qlc'
          ? QLC_FIXTURES_API_URL
          : sourceId === 'captivate'
            ? CAPTIVATE_FIXTURES_API_URL
            : OFL_FIXTURES_API_URL
      const ref =
        sourceId === 'captivate'
          ? CAPTIVATE_FIXTURE_LIBRARY_DEFAULT_BRANCH
          : 'master'
      const content = await fetchGitHubContents(
        `${baseUrl}/${encodedManufacturer}?ref=${ref}`
      )
      const extension =
        sourceId === 'qlc' ? '.qxf' : '.json'

      const fixtureFiles = content
        .filter(
          (entry): entry is GitHubFixtureFileItem =>
            entry.type === 'file' &&
            entry.name.toLowerCase().endsWith(extension) &&
            typeof entry.download_url === 'string'
        )
        .map((entry) => ({
          name: entry.name,
          path: entry.path,
          downloadUrl: entry.download_url,
        }))
        .sort((left, right) => left.name.localeCompare(right.name))

      const cacheKey = manufacturerCacheKey(sourceId, manufacturer)
      setFixturesByManufacturer((prev) => ({
        ...prev,
        [cacheKey]: fixtureFiles,
      }))
      setSelectedFixturePath(fixtureFiles[0]?.path ?? '')
    } catch (err) {
      const cacheKey = manufacturerCacheKey(sourceId, manufacturer)
      setFixturesByManufacturer((prev) => ({
        ...prev,
        [cacheKey]: [],
      }))
      setSelectedFixturePath('')
      setMessage(
        `Failed to load fixtures: ${errorMessage(err, 'Unknown error.')}`
      )
    } finally {
      setIsLoadingFixtures(false)
    }
  }

  async function importSelectedFixture() {
    if (selectedFixture === undefined) {
      setMessage('Select a fixture file to import.')
      return
    }

    setIsImporting(true)
    setMessage('')

    try {
      const response = await fetch(selectedFixture.downloadUrl)
      if (!response.ok) {
        throw new Error(`Fixture download failed (${response.status}).`)
      }

      const fixtureDefinition = await response.text()
      const importedFixtures = parseFixtureLibrary(fixtureDefinition).map(
        (fixture) => {
          if (
            source !== 'ofl' ||
            selectedManufacturerOption === undefined ||
            (typeof fixture.manufacturer === 'string' &&
              fixture.manufacturer.trim().length > 0 &&
              fixture.manufacturer.trim().toLowerCase() !== 'unknown')
          ) {
            return fixture
          }

          return {
            ...fixture,
            manufacturer: selectedManufacturerOption.label,
          }
        }
      )
      onImportFixtures(importedFixtures)
      onClose()
    } catch (err) {
      setMessage(`Import failed: ${errorMessage(err, 'Unknown error.')}`)
    } finally {
      setIsImporting(false)
    }
  }

  function handleManufacturerSelect(manufacturer: string) {
    setSelectedManufacturerBySource((prev) => ({
      ...prev,
      [source]: manufacturer,
    }))
    const cachedFixtures =
      fixturesByManufacturer[manufacturerCacheKey(source, manufacturer)]
    setSelectedFixturePath(cachedFixtures?.[0]?.path ?? '')
    setFixtureSearch('')
  }

  function handleSourceChange(event: SelectChangeEvent<string>) {
    const nextSource = event.target.value as FixtureSourceId
    setSource(nextSource)
    setSelectedFixturePath('')
    setManufacturerSearch('')
    setFixtureSearch('')
    setMessage('')
  }

  function refreshCurrentSource() {
    setManufacturersBySource((prev) => {
      const next = { ...prev }
      delete next[source]
      return next
    })
    setSelectedManufacturerBySource((prev) => {
      const next = { ...prev }
      delete next[source]
      return next
    })
    setFixturesByManufacturer((prev) => {
      const next: { [key: string]: FixtureFile[] } = {}
      for (const [cacheKey, value] of Object.entries(prev)) {
        if (!cacheKey.startsWith(`${source}:`)) {
          next[cacheKey] = value
        }
      }
      return next
    })
    setSelectedFixturePath('')
    void loadManufacturers(source)
  }

  const disableImport =
    isImporting ||
    selectedManufacturer.length === 0 ||
    selectedFixture === undefined

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1 }}>
            Search For Fixture Online
          </Typography>
          <FixtureLibraryInfoButton topic="search-online" searchSource={source} />
          <IconButton edge="end" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <DialogContent
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}
      >
        <FormControl size="small" sx={{ maxWidth: 360 }}>
          <InputLabel id="fixture-online-source-label">Source</InputLabel>
          <Select
            labelId="fixture-online-source-label"
            value={source}
            label="Source"
            onChange={handleSourceChange}
          >
            {fixtureSources.map((sourceOption) => (
              <MenuItem key={sourceOption.id} value={sourceOption.id}>
                {sourceOption.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {message.length > 0 && (
          <Typography color="error" variant="body2">
            {message}
          </Typography>
        )}

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: '1fr 2fr',
            minHeight: 0,
            flex: 1,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <Box sx={{ p: 1 }}>
              <TextField
                fullWidth
                size="small"
                label="Manufacturer"
                value={manufacturerSearch}
                onChange={(event) => {
                  setManufacturerSearch(event.target.value)
                }}
                placeholder="Filter manufacturers"
              />
            </Box>
            <List dense sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {isLoadingManufacturers && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={22} />
                </Box>
              )}
              {!isLoadingManufacturers &&
                filteredManufacturers.map((manufacturer) => (
                  <ListItemButton
                    key={manufacturer.key}
                    selected={manufacturer.key === selectedManufacturer}
                    onClick={() => handleManufacturerSelect(manufacturer.key)}
                  >
                    <ListItemText primary={manufacturer.label} />
                  </ListItemButton>
                ))}
            </List>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <Box sx={{ p: 1 }}>
              <TextField
                fullWidth
                size="small"
                label={fixtureListLabel}
                value={fixtureSearch}
                onChange={(event) => {
                  setFixtureSearch(event.target.value)
                }}
                placeholder={fixtureFilterPlaceholder}
                disabled={selectedManufacturer.length === 0}
              />
            </Box>
            <List dense sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {isLoadingFixtures && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={22} />
                </Box>
              )}
              {!isLoadingFixtures &&
                filteredFixtures.map((fixtureFile) => (
                  <ListItemButton
                    key={fixtureFile.path}
                    selected={fixtureFile.path === selectedFixturePath}
                    onClick={() => {
                      setSelectedFixturePath(fixtureFile.path)
                    }}
                  >
                    <ListItemText
                      primary={
                        source === 'captivate'
                          ? fixtureFileDisplayName(fixtureFile.name)
                          : fixtureFile.name
                      }
                      secondary={fixtureFile.path}
                    />
                  </ListItemButton>
                ))}
            </List>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={refreshCurrentSource}
          disabled={isLoadingManufacturers || isLoadingFixtures || isImporting}
        >
          Refresh
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={isImporting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void importSelectedFixture()}
          disabled={disableImport}
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  )
}
