# WLED fixtures

Captivate can drive WLED controllers as non-DMX LED fixtures. LED fixtures participate in the same light scenes, splits, group matching, master brightness, and randomizers as DMX fixtures, then the engine sends the result to WLED over the local network.

## Enable the LED editor

The WLED editor is hidden by default.

1. Choose **Extras -> Enable WLED Feature**.
2. Open the amber LED sidebar button.
3. Add an **LED Pixel Fixture**.
4. Click **Select WLED Host** to scan for controllers or enter a hostname / IPv4 address manually.

The sidebar flag is stored with the project GUI profile. If a project was saved on the LED page but the sidebar is disabled, Captivate opens back on **Universe** instead.

## Controller discovery and probing

The host picker scans the local network for WLED mDNS broadcasts:

- Service: `_wled._tcp.local`
- Scan window from the UI: about 2.2 seconds
- Manual examples: `wled.local`, `my-controller`, `192.168.1.55`

After a host is selected, Captivate probes WLED HTTP JSON endpoints on port 80:

- `/json/info` for firmware, IP address, LED count, RGBW hints, and max segments
- `/json/state` for segment IDs and segment pixel ranges
- `/json/cfg` for bus type, start, length, and analog PWM detection

Probe results choose a default output mode when the fixture is still set to **Auto**. If the controller is unreachable, the fixture remains editable and runtime output still tries the configured host.

## Fixture routing

### Pixel stream

Use **Pixel Stream** for addressable strips and matrices.

- **Segment**: when a probed segment is selected, Captivate uses that segment's start pixel and length.
- **Full Controller**: when the controller reports an LED count, Captivate uses the configured start pixel and the controller LED count.
- **Manual**: when no segment/controller count is available, set **Start Pixel** and **Pixel Limit** yourself. Set **Pixel Limit** to `0` for no explicit limit.
- **Pixel Format**: probing may switch auto-detected RGB-only controllers to `RGB`; otherwise runtime `Auto` uses RGBW packet construction before applying the protocol fallback rules below.

String fixtures support freehand, line, polyline, and curve drawing. Grid fixtures support rows, columns, pitch, and serpentine wiring. Runtime normalization clamps:

| Field | Runtime bounds |
|-------|----------------|
| Total pixels per fixture | `1..8192` |
| Grid rows / columns | `1..100` |
| Pixel spacing / pitch | `0.001..0.25` of stage width |
| Start pixel | `0..1000000` |
| Pixel limit | `1..1000000`, or `0` in the UI for no limit |
| Segment ID | `0..9999`, or blank for full controller |

### PWM RGB / RGBW

Use **PWM RGB (3ch)** or **PWM RGBW (4ch)** for WLED analog/PWM outputs. In PWM mode Captivate sends one peak color per fixture or selected segment; point layout is ignored for transport. RGBW white is derived from the minimum RGB channel.

## Runtime behavior

- Pixel fixtures broadcast UDP realtime packets to WLED port **21324** at the engine output cadence.
- Captivate enables WLED live override with `POST /json/state` payload `{ "on": true, "lor": 1 }` when a host is first tracked by the runtime.
- PWM fixtures post changed colors to `POST /json/state` on port **80**, throttled to at most once every 50 ms per host.
- Multiple Captivate fixtures can target one WLED host. Pixel fixtures are merged into one dense span per host; overlapping pixels use the maximum red/green/blue channel values.
- Pixel output follows active light scene split groups. If no split group matches while split state exists, the first split is used as a fallback.
- When a pixel host has no new active colors, configured spans send black frames; hosts without a configured span may reuse the previous span as a realtime keepalive.

Packet constraints come from WLED realtime UDP formats:

| Transport | Packet path |
|-----------|-------------|
| RGB, start pixel `0`, up to 490 LEDs | DRGB packet |
| RGBW, start pixel `0`, up to 367 LEDs | DRGBW packet |
| RGB with offset or larger frames | DNRGB chunks of up to 489 LEDs |
| RGBW with offset or larger frames | Falls back to RGB/DNRGB because WLED does not define indexed DNRGBW |

## Troubleshooting

| Symptom | Check |
|---------|-------|
| LED page is missing | Choose **Extras -> Enable WLED Feature**. |
| Scan finds no controllers | Confirm the WLED device and show computer are on the same LAN/VLAN and mDNS is not blocked. Use a manual IP if multicast discovery is unavailable. |
| Probe says unreachable | Open `http://<host>/json/info` from the show computer and check firewall/VPN routing to TCP port 80. |
| Pixels do not update | Confirm WLED realtime UDP is reachable on port 21324, the host/IP is correct, and the active scene has non-black output for the fixture group. |
| Only part of a strip updates | Check selected segment, start pixel, pixel limit, fixture pixel count, and WLED's configured LED count. |
| RGBW strip loses white on large or offset ranges | Use start pixel 0 with 367 or fewer pixels for DRGBW, split the fixture, or use RGB transport; indexed RGBW packets are not supported by the WLED UDP protocol path used here. |
| PWM fixture ignores placement | Expected: PWM output sends one shared fixture/segment color, not per-pixel layout. |
| Debugging runtime errors | Export diagnostics and look for `wled`, `wled.device`, `wled.discovery`, or `ipc` telemetry counters and health messages. |

## Implementation map

- Fixture model, layout sampling, and runtime normalization: `src/shared/ledFixtures.ts`
- Shared WLED capability/routing types: `src/shared/wledDiscovery.ts`
- LED page and placement editor: `src/renderer/pages/LedPage.tsx`, `src/renderer/led/*`
- Renderer IPC wrappers: `src/renderer/ipcHandler.ts`
- Main IPC handlers: `src/main/engine/ipcHandler.ts`
- mDNS discovery: `src/main/engine/wled/wled_discovery.ts`
- HTTP capability probing: `src/main/engine/wled/wled_capabilities.ts`
- UDP packet building: `src/main/engine/wled/udp_buffer.ts`
- Runtime output manager: `src/main/engine/wled/wled_manager.ts`
- WLED device transport: `src/main/engine/wled/wled_device.ts`
