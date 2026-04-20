import { spawn } from 'child_process'
import ffmpegStaticPath from 'ffmpeg-static'

const SAMPLE_RATE = 44100
const FRAME_SIZE = 1024
const HOP_SIZE = 512
const TARGET_A = { first: 70, second: 97 }
const TARGET_B = { first: 97, second: 70 }

interface CalibrationParams {
  beatSensitivity: number
  beatMinIntervalMs: number
  bpmSmoothing: number
}

interface CalibrationResult {
  params: CalibrationParams
  score: number
  orientation: '70->97' | '97->70'
  firstSectionBpm: number | null
  secondSectionBpm: number | null
  firstSectionBeats: number
  secondSectionBeats: number
  totalBeats: number
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function lerp(min: number, max: number, t: number) {
  const normalized = clamp01(t)
  return min + (max - min) * normalized
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle]
  return (sorted[middle - 1] + sorted[middle]) / 2
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const normalizedQ = clamp01(q)
  const index = normalizedQ * (sorted.length - 1)
  const indexFloor = Math.floor(index)
  const indexCeil = Math.ceil(index)
  if (indexFloor === indexCeil) return sorted[indexFloor]
  const frac = index - indexFloor
  return sorted[indexFloor] * (1 - frac) + sorted[indexCeil] * frac
}

async function decodeLowBandEnergy(inputPath: string): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = ffmpegStaticPath || 'ffmpeg'
    const args = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      inputPath,
      '-vn',
      '-ac',
      '1',
      '-ar',
      String(SAMPLE_RATE),
      '-af',
      'highpass=f=40,lowpass=f=180',
      '-f',
      'f32le',
      'pipe:1',
    ]

    const ffmpeg = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []

    ffmpeg.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk))
    ffmpeg.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk))

    ffmpeg.on('error', (error) => reject(error))
    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `ffmpeg exited with code ${code}: ${Buffer.concat(stderrChunks).toString('utf8')}`
          )
        )
        return
      }

      const raw = Buffer.concat(stdoutChunks)
      const floatCount = Math.floor(raw.length / 4)
      if (floatCount <= FRAME_SIZE) {
        resolve([])
        return
      }

      const samples = new Float32Array(
        raw.buffer,
        raw.byteOffset,
        floatCount
      )
      const rms: number[] = []

      for (
        let start = 0;
        start + FRAME_SIZE <= samples.length;
        start += HOP_SIZE
      ) {
        let sumSquares = 0
        for (let i = 0; i < FRAME_SIZE; i++) {
          const sample = samples[start + i]
          sumSquares += sample * sample
        }
        rms.push(Math.sqrt(sumSquares / FRAME_SIZE))
      }

      const p99 = Math.max(1e-6, quantile(rms, 0.99))
      const normalized = rms.map((value) => clamp01(value / p99))
      resolve(normalized)
    })
  })
}

function estimateSectionTempo(
  beatTimesMs: number[],
  sectionStartMs: number,
  sectionEndMs: number
): number | null {
  const bpmValues: number[] = []
  for (let i = 1; i < beatTimesMs.length; i++) {
    const beatPrev = beatTimesMs[i - 1]
    const beatNow = beatTimesMs[i]
    const midpoint = (beatPrev + beatNow) * 0.5
    if (midpoint < sectionStartMs || midpoint >= sectionEndMs) {
      continue
    }
    const periodMs = beatNow - beatPrev
    if (periodMs <= 0) continue
    const bpm = 60000 / periodMs
    if (bpm >= 45 && bpm <= 220) {
      bpmValues.push(bpm)
    }
  }
  return median(bpmValues)
}

function countBeatsInSection(
  beatTimesMs: number[],
  sectionStartMs: number,
  sectionEndMs: number
): number {
  let count = 0
  for (const beatTime of beatTimesMs) {
    if (beatTime >= sectionStartMs && beatTime < sectionEndMs) {
      count++
    }
  }
  return count
}

function computeScore(
  firstBpm: number | null,
  secondBpm: number | null,
  firstCount: number,
  secondCount: number,
  firstTarget: number,
  secondTarget: number,
  sectionDurationMs: number
): number {
  if (firstBpm === null || secondBpm === null) {
    return 1e9
  }

  const expectedFirstCount = (firstTarget * sectionDurationMs) / 60000
  const expectedSecondCount = (secondTarget * sectionDurationMs) / 60000
  const firstCountError =
    Math.abs(firstCount - expectedFirstCount) / Math.max(1, expectedFirstCount)
  const secondCountError =
    Math.abs(secondCount - expectedSecondCount) /
    Math.max(1, expectedSecondCount)

  const tempoError = Math.abs(firstBpm - firstTarget) + Math.abs(secondBpm - secondTarget)
  const countPenalty = (firstCountError + secondCountError) * 35
  return tempoError + countPenalty
}

function runDetector(
  lowBandEnergy: number[],
  params: CalibrationParams
): CalibrationResult {
  const hopMs = (HOP_SIZE / SAMPLE_RATE) * 1000
  const totalDurationMs = lowBandEnergy.length * hopMs
  const firstSectionStartMs = 0
  const firstSectionEndMs = totalDurationMs * 0.35
  const secondSectionStartMs = totalDurationMs * 0.65
  const secondSectionEndMs = totalDurationMs
  const sectionDurationMs = firstSectionEndMs - firstSectionStartMs

  const sensitivity = clamp01(params.beatSensitivity)
  const emaAlpha = lerp(0.18, 0.06, sensitivity)
  const thresholdMultiplier = lerp(1.65, 1.12, sensitivity)
  const thresholdFloor = lerp(0.04, 0.01, sensitivity)
  const minTriggerLevel = lerp(0.04, 0.012, sensitivity)
  const minBeatIntervalMs = Math.max(1, params.beatMinIntervalMs)
  const bpmBlend = clamp01(params.bpmSmoothing)

  let beatEnergyEma = 0
  let lastBeatAtMs = -Infinity
  let bpmEstimate: number | null = null
  const beatTimesMs: number[] = []

  for (let frameIndex = 0; frameIndex < lowBandEnergy.length; frameIndex++) {
    const nowMs = frameIndex * hopMs
    const energy = lowBandEnergy[frameIndex]

    beatEnergyEma = beatEnergyEma * (1 - emaAlpha) + energy * emaAlpha
    const threshold = beatEnergyEma * thresholdMultiplier + thresholdFloor
    const beatDetected =
      energy > threshold &&
      energy > minTriggerLevel &&
      nowMs - lastBeatAtMs > minBeatIntervalMs

    if (!beatDetected) {
      continue
    }

    if (lastBeatAtMs > -Infinity) {
      const periodMs = nowMs - lastBeatAtMs
      const instantBpm = 60000 / Math.max(1, periodMs)
      if (instantBpm >= 45 && instantBpm <= 220) {
        bpmEstimate =
          bpmEstimate === null
            ? instantBpm
            : bpmEstimate * (1 - bpmBlend) + instantBpm * bpmBlend
      }
    }
    lastBeatAtMs = nowMs
    beatTimesMs.push(nowMs)
  }

  const firstBpm = estimateSectionTempo(
    beatTimesMs,
    firstSectionStartMs,
    firstSectionEndMs
  )
  const secondBpm = estimateSectionTempo(
    beatTimesMs,
    secondSectionStartMs,
    secondSectionEndMs
  )
  const firstCount = countBeatsInSection(
    beatTimesMs,
    firstSectionStartMs,
    firstSectionEndMs
  )
  const secondCount = countBeatsInSection(
    beatTimesMs,
    secondSectionStartMs,
    secondSectionEndMs
  )

  const scoreA = computeScore(
    firstBpm,
    secondBpm,
    firstCount,
    secondCount,
    TARGET_A.first,
    TARGET_A.second,
    sectionDurationMs
  )
  const scoreB = computeScore(
    firstBpm,
    secondBpm,
    firstCount,
    secondCount,
    TARGET_B.first,
    TARGET_B.second,
    sectionDurationMs
  )

  const orientation = scoreA <= scoreB ? '70->97' : '97->70'
  return {
    params,
    score: Math.min(scoreA, scoreB),
    orientation,
    firstSectionBpm: firstBpm,
    secondSectionBpm: secondBpm,
    firstSectionBeats: firstCount,
    secondSectionBeats: secondCount,
    totalBeats: beatTimesMs.length,
  }
}

function formatResult(result: CalibrationResult) {
  const first = result.firstSectionBpm === null ? '--' : result.firstSectionBpm.toFixed(1)
  const second =
    result.secondSectionBpm === null ? '--' : result.secondSectionBpm.toFixed(1)
  return [
    `score=${result.score.toFixed(2)}`,
    `orientation=${result.orientation}`,
    `first=${first} BPM`,
    `second=${second} BPM`,
    `beats=${result.totalBeats}`,
    `params[sens=${result.params.beatSensitivity.toFixed(2)}, minInt=${Math.round(
      result.params.beatMinIntervalMs
    )}ms, smooth=${result.params.bpmSmoothing.toFixed(2)}]`,
  ].join(' | ')
}

async function main() {
  const inputPath = process.argv.slice(2).join(' ').trim()
  if (inputPath.length === 0) {
    console.error('Usage: npx ts-node tools/audio_beat_calibrate.ts "<path-to-audio-file>"')
    process.exit(1)
    return
  }

  console.log(`Decoding and analyzing: ${inputPath}`)
  const lowBandEnergy = await decodeLowBandEnergy(inputPath)
  if (lowBandEnergy.length === 0) {
    console.error('No audio frames decoded from file.')
    process.exit(1)
    return
  }

  const results: CalibrationResult[] = []
  const sensitivityValues = [0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7]
  const minIntervalValues = [220, 240, 260, 280, 300, 320, 340]
  const smoothingValues = [0.1, 0.15, 0.2, 0.25, 0.3, 0.35]

  for (const beatSensitivity of sensitivityValues) {
    for (const beatMinIntervalMs of minIntervalValues) {
      for (const bpmSmoothing of smoothingValues) {
        results.push(
          runDetector(lowBandEnergy, {
            beatSensitivity,
            beatMinIntervalMs,
            bpmSmoothing,
          })
        )
      }
    }
  }

  results.sort((left, right) => left.score - right.score)

  const baseline = runDetector(lowBandEnergy, {
    beatSensitivity: 0.45,
    beatMinIntervalMs: 260,
    bpmSmoothing: 0.12,
  })

  console.log('\nBaseline (current defaults):')
  console.log(formatResult(baseline))
  console.log('\nTop candidates:')
  for (const result of results.slice(0, 8)) {
    console.log(formatResult(result))
  }
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
