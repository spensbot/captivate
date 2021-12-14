import React from 'react'
import styled from 'styled-components'
import {shell} from 'electron'
import wrapClick from '../base/wrapClick'
import OpenInBrowserIcon from '@material-ui/icons/OpenInBrowser';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';

interface Props {url: string, label?: string}

export default function ExternalLink({url, label}: Props) {
  const onClick = () => shell.openExternal(url)

  return (
    <Root>
      <LinkText onClick={wrapClick(onClick)}>
        {label ? label : url}
      </LinkText>
      <OpenInNewIcon style={{width: '1rem'}}/>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
`

const LinkText = styled.div`
  text-decoration: underline;
  color: ${props => props.theme.colors.primary.main};
  cursor: pointer;
  margin-right: ${props => props.theme.spacing(0.2)};
`