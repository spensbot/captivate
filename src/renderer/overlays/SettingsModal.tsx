import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import AppModal from './AppModal'
import { useTypedSelector } from '../redux/store'
import { setAppSettings, setSettingsOpen } from '../redux/guiSlice'
import {
  BUILTIN_LANGUAGE_PACKS,
  BUILTIN_THEME_PACKS,
  type AppSettings,
  type LanguagePackId,
  type ThemePackId,
} from '../../shared/appSettings'
import { persistAppSettings } from '../appSettingsClient'

export default function SettingsModal() {
  const dispatch = useDispatch()
  const open = useTypedSelector((state) => state.gui.settingsOpen)
  const stored = useTypedSelector((state) => state.gui.appSettings)
  const [draft, setDraft] = useState<AppSettings>(stored)

  useEffect(() => {
    if (open) {
      setDraft(stored)
    }
  }, [open, stored])

  if (!open) {
    return null
  }

  async function onSave() {
    const next = await persistAppSettings(draft)
    dispatch(setAppSettings(next))
    dispatch(setSettingsOpen(false))
  }

  return (
    <AppModal
      open={true}
      title="Settings"
      maxWidth="34rem"
      onClose={() => dispatch(setSettingsOpen(false))}
      actions={[
        {
          label: 'Cancel',
          onClick: () => dispatch(setSettingsOpen(false)),
        },
        {
          label: 'Save',
          onClick: () => {
            void onSave()
          },
        },
      ]}
    >
      <Intro>
        Application preferences are saved on this computer. Theme packs and
        language packs will be installable extensions in a future release.
      </Intro>

      <Section>
        <SectionTitle>Appearance</SectionTitle>
        <FieldLabel htmlFor="settings-theme-pack">Theme</FieldLabel>
        <Select
          id="settings-theme-pack"
          value={draft.themePackId}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              themePackId: event.target.value as ThemePackId,
            }))
          }
        >
          {BUILTIN_THEME_PACKS.map((pack) => (
            <option key={pack.id} value={pack.id}>
              {pack.label}
            </option>
          ))}
        </Select>
        <Hint>
          {
            BUILTIN_THEME_PACKS.find((pack) => pack.id === draft.themePackId)
              ?.description
          }
        </Hint>
      </Section>

      <Section>
        <SectionTitle>Language</SectionTitle>
        <FieldLabel htmlFor="settings-language-pack">UI language</FieldLabel>
        <Select
          id="settings-language-pack"
          value={draft.languagePackId}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              languagePackId: event.target.value as LanguagePackId,
            }))
          }
        >
          {BUILTIN_LANGUAGE_PACKS.map((pack) => (
            <option
              key={pack.id}
              value={pack.id}
              disabled={!pack.available}
            >
              {pack.label}
              {!pack.available ? ' (coming soon)' : ''}
            </option>
          ))}
        </Select>
        <Hint>
          {
            BUILTIN_LANGUAGE_PACKS.find(
              (pack) => pack.id === draft.languagePackId
            )?.description
          }{' '}
          Additional language packs will plug in here when available.
        </Hint>
      </Section>
    </AppModal>
  )
}

const Intro = styled.p`
  margin: 0 0 0.85rem;
  font-size: 0.82rem;
  line-height: 1.45;
  color: ${(p) => p.theme.colors.text.secondary};
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
`

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 0.88rem;
  font-weight: 700;
  color: ${(p) => p.theme.colors.text.primary};
`

const FieldLabel = styled.label`
  font-size: 0.78rem;
  color: ${(p) => p.theme.colors.text.secondary};
`

const Select = styled.select`
  width: 100%;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.3rem;
  background: ${(p) => p.theme.colors.bg.darker};
  color: ${(p) => p.theme.colors.text.primary};
  font-size: 0.82rem;
  padding: 0.35rem 0.45rem;
`

const Hint = styled.div`
  font-size: 0.74rem;
  line-height: 1.35;
  color: ${(p) => p.theme.colors.text.secondary};
`
