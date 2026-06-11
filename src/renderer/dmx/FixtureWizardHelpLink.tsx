import Link from '@mui/material/Link'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import styled from 'styled-components'
import {
  CAPTIVATE_WIKI_FIXTURES,
  CAPTIVATE_WIKI_HOME,
  CAPTIVATE_WIKI_LIGHTING_3D,
} from '../../shared/captivateWiki'

export type FixtureWizardHelpTopic =
  | 'creation-basics'
  | 'creation-channels'
  | 'creation-segments'
  | 'creation-review'
  | 'model-intro'
  | 'model-settings'
  | 'model-review'

const TOPIC_LINKS: Record<
  FixtureWizardHelpTopic,
  { href: string; label: string }
> = {
  'creation-basics': {
    href: CAPTIVATE_WIKI_FIXTURES,
    label: 'Wiki: fixtures overview',
  },
  'creation-channels': {
    href: CAPTIVATE_WIKI_FIXTURES,
    label: 'Wiki: DMX channels',
  },
  'creation-segments': {
    href: CAPTIVATE_WIKI_FIXTURES,
    label: 'Wiki: segments & subfixtures',
  },
  'creation-review': {
    href: CAPTIVATE_WIKI_HOME,
    label: 'Wiki: getting started',
  },
  'model-intro': {
    href: CAPTIVATE_WIKI_LIGHTING_3D,
    label: 'Wiki: 3D lighting preview',
  },
  'model-settings': {
    href: CAPTIVATE_WIKI_LIGHTING_3D,
    label: 'Wiki: fixture models & emitters',
  },
  'model-review': {
    href: CAPTIVATE_WIKI_LIGHTING_3D,
    label: 'Wiki: 3D lighting preview',
  },
}

type Props = {
  topic: FixtureWizardHelpTopic
}

export default function FixtureWizardHelpLink({ topic }: Props) {
  const { href, label } = TOPIC_LINKS[topic]
  return (
    <Root>
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        variant="body2"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.76rem',
        }}
      >
        {label}
        <OpenInNewIcon sx={{ fontSize: '0.85rem' }} />
      </Link>
    </Root>
  )
}

const Root = styled.div`
  margin-top: 0.35rem;
`
