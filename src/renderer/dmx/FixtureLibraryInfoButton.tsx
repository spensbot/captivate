import { useState, type ReactNode } from 'react'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Popover from '@mui/material/Popover'
import Typography from '@mui/material/Typography'
import styled from 'styled-components'
import {
  captivateFixtureLibraryContributeUrl,
  captivateFixtureLibraryRepoUrl,
} from '../../shared/captivateFixtureLibraryRemote'

const POPOVER_PAPER_SX = {
  maxWidth: '24rem',
  p: 1.25,
  lineHeight: 1.45,
  fontSize: '0.78rem',
} as const

export type FixtureLibraryHelpTopic =
  | 'fixtures-panel'
  | 'add-fixture'
  | 'share-to-library'
  | 'search-online'

type Props = {
  topic: FixtureLibraryHelpTopic
  /** For share help — suggested path when manufacturer + model are set. */
  relativePath?: string
  searchSource?: 'captivate' | 'qlc' | 'ofl'
  ariaLabel?: string
}

function HelpTitle({ children }: { children: ReactNode }) {
  return (
    <Typography
      component="div"
      sx={{ fontSize: '0.82rem', fontWeight: 600, mb: 0.5 }}
    >
      {children}
    </Typography>
  )
}

function HelpList({ children }: { children: ReactNode }) {
  return <HelpListRoot>{children}</HelpListRoot>
}

function HelpBody({ topic, relativePath, searchSource }: Props) {
  if (topic === 'fixtures-panel') {
    return (
      <>
        <HelpTitle>Fixtures</HelpTitle>
        <HelpList>
          <li>
            <strong>Load DB</strong> / <strong>Save DB</strong> — import or
            export all fixture types in this project to your local library file.
          </li>
          <li>
            <strong>Add</strong> (+) — create a fixture, import from disk, or{' '}
            <strong>Search For Fixture Online</strong> (Captivate Community
            Library, QLC+, Open Fixture Library).
          </li>
          <li>
            Edit a fixture → <strong>Share to Library…</strong> to submit to
            the community (see help on that dialog).
          </li>
        </HelpList>
        <HelpLinks />
      </>
    )
  }

  if (topic === 'add-fixture') {
    return (
      <>
        <HelpTitle>Add fixture</HelpTitle>
        <HelpList>
          <li>
            <strong>Create New</strong> — blank Captivate fixture type.
          </li>
          <li>
            <strong>Import From File</strong> — Captivate library JSON, or
            converted QLC+ / Open Fixture Library files.
          </li>
          <li>
            <strong>Search For Fixture Online</strong> — browse by manufacturer
            and model; default source is Captivate Community Library.
          </li>
        </HelpList>
      </>
    )
  }

  if (topic === 'share-to-library') {
    return (
      <>
        <HelpTitle>Share to community library</HelpTitle>
        <HelpList>
          <li>
            You need <strong>Manufacturer</strong> and <strong>Fixture Name</strong>{' '}
            on this fixture.
          </li>
          <li>
            <strong>Share to Library</strong> — sign in on the GitHub page that
            opens. Captivate puts a sign-in code on your clipboard; paste it when
            GitHub asks. The library adds your fixture for everyone automatically.
          </li>
          <li>
            If sign-in fails, try again or use <strong>Save a copy…</strong> and
            the website link below.
          </li>
          <li>
            <strong>Save a copy…</strong> — keep a backup on your computer or use
            it with the web form.
          </li>
        </HelpList>
        <HelpLinks />
      </>
    )
  }

  return (
    <>
      <HelpTitle>Search for fixture online</HelpTitle>
      <HelpList>
        <li>
          Pick a <strong>Source</strong>, then a <strong>manufacturer</strong>{' '}
          and <strong>model</strong>, then <strong>Import</strong>.
        </li>
        <li>
          <strong>Captivate Community Library</strong> — native definitions
          (channels, emitters, mover calibration, 3D preview).
        </li>
        <li>
          <strong>QLC+</strong> and <strong>Open Fixture Library</strong> —
          converted on import; you may need to tweak channels afterward.
        </li>
        <li>Use <strong>Refresh</strong> if the list looks stale.</li>
      </HelpList>
      {searchSource === 'captivate' && (
        <Typography variant="body2" sx={{ mt: 0.75, opacity: 0.9 }}>
          To share a fixture you built, edit it in the Fixtures list and use{' '}
          <strong>Share to Library…</strong>.
        </Typography>
      )}
      <HelpLinks />
    </>
  )
}

function HelpLinks() {
  return (
    <LinksRow>
      <Link
        href={captivateFixtureLibraryContributeUrl()}
        target="_blank"
        rel="noopener noreferrer"
        variant="body2"
      >
        Contribution guide
      </Link>
      <span> · </span>
      <Link
        href={captivateFixtureLibraryRepoUrl()}
        target="_blank"
        rel="noopener noreferrer"
        variant="body2"
      >
        Library on GitHub
      </Link>
    </LinksRow>
  )
}

export default function FixtureLibraryInfoButton({
  topic,
  relativePath,
  searchSource,
  ariaLabel,
}: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const open = anchor !== null

  const defaultAria =
    topic === 'share-to-library'
      ? 'How to share to the community fixture library'
      : topic === 'search-online'
        ? 'How to search for fixtures online'
        : topic === 'add-fixture'
          ? 'How to add a fixture'
          : 'About fixtures and the library'

  return (
    <>
      <IconButton
        size="small"
        aria-label={ariaLabel ?? defaultAria}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          padding: '0.12rem',
          color: 'text.secondary',
          '&:hover': { color: 'text.primary' },
        }}
      >
        <InfoOutlined sx={{ fontSize: '1rem' }} />
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: POPOVER_PAPER_SX } }}
      >
        <HelpBody
          topic={topic}
          relativePath={relativePath}
          searchSource={searchSource}
        />
      </Popover>
    </>
  )
}

const HelpListRoot = styled.ul`
  margin: 0;
  padding-left: 1.1rem;
  color: ${(p) => p.theme.colors.text.secondary};

  li + li {
    margin-top: 0.35rem;
  }
`

const PathLine = styled.div`
  margin-top: 0.5rem;
  font-size: 0.76rem;
  color: ${(p) => p.theme.colors.text.secondary};

  code {
    font-family: ui-monospace, monospace;
    font-size: 0.72rem;
  }
`

const LinksRow = styled.div`
  margin-top: 0.65rem;
  font-size: 0.76rem;
`
