/** Stable ids/names for default-save light scenes (core ladder + mover showcases). */
export interface DefaultLightSceneCatalogEntry {
  id: string
  name: string
}

/** One entry per {@link EPICNESS_LADDER} tier, in generation order. */
export const DEFAULT_LIGHT_SCENE_CORE_CATALOG: DefaultLightSceneCatalogEntry[] = [
  { id: 'ex_moonlight', name: 'Moonlight' },
  { id: 'ex_ambient_glow', name: 'Ambient Glow' },
  { id: 'ex_candle_breathe', name: 'Candle Breathe' },
  { id: 'ex_cool_mist', name: 'Cool Mist' },
  { id: 'ex_soft_tap', name: 'Soft Offbeat Tap' },
  { id: 'ex_dusk_wash', name: 'Dusk Wash' },
  { id: 'ex_breakdown_shimmer', name: 'Breakdown Shimmer' },
  { id: 'ex_beat_pulse', name: 'Beat Pulse' },
  { id: 'ex_offbeat_pulse', name: 'Offbeat Pulse' },
  { id: 'ex_half_time_gate', name: 'Half-Time Gate' },
  { id: 'ex_kick_band', name: 'Kick Band Pulse' },
  { id: 'ex_snare_pop', name: 'Snare Pop' },
  { id: 'ex_hat_sparkle', name: 'Hi-Hat Sparkle' },
  { id: 'ex_vocal_glow', name: 'Vocal Glow' },
  { id: 'ex_energy_swell', name: 'Energy Swell' },
  { id: 'ex_build_ramp', name: 'Build Ramp' },
  { id: 'ex_rhythm_colors', name: 'Rhythm Color Shift' },
  { id: 'ex_polyrhythm', name: 'Polyrhythm Mix' },
  { id: 'ex_bass_drop', name: 'Bass Drop Flash' },
  { id: 'ex_section_director', name: '8-Bar Section Mix' },
  { id: 'ex_noise_journey', name: 'Noise Color Drift' },
  { id: 'ex_dual_pulse', name: 'Dual Pulse Zones' },
  { id: 'ex_call_response', name: 'Call & Response' },
  { id: 'ex_wigwag_halves', name: 'Wig-Wag Halves' },
  { id: 'ex_16bar_journey', name: '16-Bar LFO Journey' },
  { id: 'ex_triple_stack', name: 'Triple Stack' },
  { id: 'ex_spectrum_zones', name: 'Spectrum Zones' },
  { id: 'ex_random_spark', name: 'Random Spark Hits' },
  { id: 'ex_strobe_color', name: 'Strobe Color Gate' },
  { id: 'ex_peak_drive', name: 'Peak Drive' },
  { id: 'ex_main_peak', name: 'Main Room Peak' },
]

/** One entry per mover showcase, in {@link MOVER_SHOWCASES} generation order. */
export const DEFAULT_LIGHT_SCENE_MOVER_CATALOG: DefaultLightSceneCatalogEntry[] = [
  { id: 'ex_mover_sweep', name: 'Mover Sweep' },
  { id: 'ex_mover_tandem', name: 'Mover Tandem' },
  { id: 'ex_mover_beat_tilt', name: 'Mover Beat Tilt Sweep' },
  { id: 'ex_mover_pan_cascade', name: 'Mover Pan Cascade' },
  { id: 'ex_mover_mirror', name: 'Mover Mirror' },
  { id: 'ex_mover_peak', name: 'Mover Peak Drive' },
]
