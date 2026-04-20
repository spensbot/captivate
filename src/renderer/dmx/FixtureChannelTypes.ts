export interface FixtureChannelItemProps {
  fixtureID: string
  channelIndex: number
  channelCount: number
  hasMaster: boolean
  isInUse: boolean
  editing: number | null
  setEditing: (ch: number | null) => void
}
