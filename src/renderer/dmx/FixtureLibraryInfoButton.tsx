import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import styled from 'styled-components'
import {
  captivateFixtureLibraryContributeUrl,
  captivateFixtureLibraryRepoUrl,
} from '../../shared/captivateFixtureLibraryRemote'
import SectionHelpButton, {
  HelpIntro,
  HelpList,
  HelpTitle,
} from './SectionHelpPopover'

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

function HelpBody({ topic, searchSource }: Props) {
  if (topic === 'fixtures-panel') {
    return (
      <>
        <HelpTitle>How to manage fixtures</HelpTitle>
        <HelpIntro>
          Fixture types describe your lights — channels, segments, and how they
          look in preview. Define them here before patching addresses on the
          right.
        </HelpIntro>
        <HelpList>
          <li>
            To add a fixture type, click <strong>+</strong> and choose create,
            import, or search online.
          </li>
          <li>
            To edit channels, segments, or the 3D model, click a fixture in
            this list and use the editor that opens.
          </li>
          <li>
            To back up or restore your whole library, use{' '}
            <strong>Load DB</strong> and <strong>Save DB</strong> at the bottom
            of the list.
          </li>
          <li>
            To share a fixture you built with the community, open it for editing
            and choose <strong>Share to Library…</strong> (see help on that
            dialog).
          </li>
        </HelpList>
        <HelpLinks />
      </>
    )
  }

  if (topic === 'add-fixture') {
    return (
      <>
        <HelpTitle>How to add a fixture type</HelpTitle>
        <HelpIntro>
          Pick the path that matches how you want to get started. You can always
          edit the definition afterward.
        </HelpIntro>
        <HelpList>
          <li>
            To build one from scratch, choose <strong>Create New</strong> and
            follow the wizard for channels and layout. You can set up the 3D
            model when you finish.
          </li>
          <li>
            To load a file you already have, choose{' '}
            <strong>Import From File</strong> (Captivate, QLC+, or Open Fixture
            Library formats).
          </li>
          <li>
            To browse published definitions, choose{' '}
            <strong>Search For Fixture Online</strong>, pick manufacturer and
            model, then import.
          </li>
        </HelpList>
      </>
    )
  }

  if (topic === 'share-to-library') {
    return (
      <>
        <HelpTitle>How to share to the community library</HelpTitle>
        <HelpIntro>
          Share a fixture you built so others can import it from the online
          browser. You need a manufacturer and fixture name filled in first.
        </HelpIntro>
        <HelpList>
          <li>
            To publish through Captivate, choose <strong>Share to Library</strong>.
            A GitHub sign-in page opens — Captivate copies a code to your
            clipboard; paste it when GitHub asks.
          </li>
          <li>
            If sign-in does not work, try again or use <strong>Save a copy…</strong>{' '}
            and submit through the website link below.
          </li>
          <li>
            To keep a local backup either way, use <strong>Save a copy…</strong>.
          </li>
        </HelpList>
        <HelpLinks />
      </>
    )
  }

  return (
    <>
      <HelpTitle>How to search for fixtures online</HelpTitle>
      <HelpIntro>
        Import a published definition instead of building one by hand. You can
        adjust channels after import if needed.
      </HelpIntro>
      <HelpList>
        <li>
          Choose a <strong>Source</strong>, then pick <strong>manufacturer</strong>{' '}
          and <strong>model</strong>, and click <strong>Import</strong>.
        </li>
        <li>
          For the best preview and mover support, prefer the{' '}
          <strong>Captivate Community Library</strong>.
        </li>
        <li>
          <strong>QLC+</strong> and <strong>Open Fixture Library</strong> files
          are converted on import — review channels afterward.
        </li>
        <li>
          If the list looks out of date, click <strong>Refresh</strong>.
        </li>
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
  const defaultAria =
    topic === 'share-to-library'
      ? 'How to share to the community fixture library'
      : topic === 'search-online'
        ? 'How to search for fixtures online'
        : topic === 'add-fixture'
          ? 'How to add a fixture type'
          : 'How to manage fixtures'

  return (
    <SectionHelpButton ariaLabel={ariaLabel ?? defaultAria}>
      <HelpBody
        topic={topic}
        relativePath={relativePath}
        searchSource={searchSource}
      />
    </SectionHelpButton>
  )
}

const LinksRow = styled.div`
  margin-top: 0.65rem;
  font-size: 0.76rem;
`
