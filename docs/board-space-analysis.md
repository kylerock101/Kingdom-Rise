# Kingdom Rise Board Space Analysis

Generated from current `beta.html` board constants and deterministic path algorithm. No gameplay changes are implied by this report.

## Board Generation

- Total board spaces: 48
- Unique tile types: 15
- Layout type: deterministic generated 3D path with fixed tile-type sequence.
- Path algorithm: samples 1,920 points from a wobbled circular loop, then places 48 tiles at equal arc-length intervals.
- Bridge elevation: indexes 24 through 31 receive raised-cosine y offsets around bridge span 26-29.
- Tile type algorithm: index 0 is `go`; indexes 1-47 repeat a fixed 24-entry sequence; index 16 is overridden to `bless`.

## Exact Board Order

| Index | Type | Label | Position x,y,z |
|---:|---|---|---|
| 0 | `go` | ?? | 19.108, 0.000, 0.000 |
| 1 | `coin` | ?? | 19.167, 0.000, 2.204 |
| 2 | `fortune` | ?? | 18.391, 0.000, 4.271 |
| 3 | `decree` | ?? | 17.029, 0.000, 6.018 |
| 4 | `chest` | ?? | 15.338, 0.000, 7.452 |
| 5 | `coin` | ?? | 13.489, 0.000, 8.680 |
| 6 | `gem` | ?? | 11.600, 0.000, 9.846 |
| 7 | `raid` | ?? | 9.735, 0.000, 11.050 |
| 8 | `crime` | ??? | 7.831, 0.000, 12.190 |
| 9 | `wheel` | ?? | 5.760, 0.000, 12.975 |
| 10 | `coin` | ?? | 3.556, 0.000, 13.160 |
| 11 | `hazard` | ?? | 1.366, 0.000, 12.810 |
| 12 | `bonus` | ? | -0.805, 0.000, 12.354 |
| 13 | `decree` | ?? | -3.011, 0.000, 12.468 |
| 14 | `recruit` | ??? | -5.146, 0.000, 13.074 |
| 15 | `coin` | ?? | -7.280, 0.000, 13.684 |
| 16 | `bless` | ?? | -9.468, 0.000, 14.051 |
| 17 | `dragon` | ?? | -11.682, 0.000, 13.998 |
| 18 | `crime` | ??? | -13.793, 0.000, 13.343 |
| 19 | `gem` | ?? | -15.508, 0.000, 11.959 |
| 20 | `coin` | ?? | -16.486, 0.000, 9.985 |
| 21 | `chest` | ?? | -16.665, 0.000, 7.782 |
| 22 | `sprint` | ?? | -16.238, 0.000, 5.608 |
| 23 | `decree` | ?? | -15.425, 0.000, 3.544 |
| 24 | `fortune` | ?? | -14.430, 0.055, 1.560 |
| 25 | `coin` | ?? | -13.550, 0.448, -0.475 |
| 26 | `fortune` | ?? | -13.235, 1.002, -2.664 |
| 27 | `decree` | ?? | -13.325, 1.395, -4.882 |
| 28 | `chest` | ?? | -13.223, 1.395, -7.097 |
| 29 | `coin` | ?? | -12.568, 1.002, -9.209 |
| 30 | `gem` | ?? | -11.267, 0.448, -10.995 |
| 31 | `raid` | ?? | -9.503, 0.055, -12.334 |
| 32 | `crime` | ??? | -7.535, 0.000, -13.360 |
| 33 | `wheel` | ?? | -5.534, 0.000, -14.322 |
| 34 | `coin` | ?? | -3.556, 0.000, -15.328 |
| 35 | `hazard` | ?? | -1.532, 0.000, -16.240 |
| 36 | `bonus` | ? | 0.614, 0.000, -16.785 |
| 37 | `decree` | ?? | 2.818, 0.000, -16.661 |
| 38 | `recruit` | ??? | 4.807, 0.000, -15.708 |
| 39 | `coin` | ?? | 6.325, 0.000, -14.101 |
| 40 | `fortune` | ?? | 7.365, 0.000, -12.144 |
| 41 | `dragon` | ?? | 8.123, 0.000, -10.058 |
| 42 | `crime` | ??? | 9.094, 0.000, -8.073 |
| 43 | `gem` | ?? | 10.861, 0.000, -6.763 |
| 44 | `coin` | ?? | 12.899, 0.000, -5.881 |
| 45 | `chest` | ?? | 14.894, 0.000, -4.911 |
| 46 | `sprint` | ?? | 16.720, 0.000, -3.654 |
| 47 | `decree` | ?? | 18.209, 0.000, -2.017 |

## Counts And Spacing

- Most common tile(s): `coin` (10 each).
- Least common tile(s): `bless`, `go` (1 each).

| Tile type | Label | Count | Percent | Indexes | Avg spacing | Min gap | Max gap | Longest run without |
|---|---|---:|---:|---|---:|---:|---:|---:|
| `coin` | ?? | 10 | 20.83% | 1, 5, 10, 15, 20, 25, 29, 34, 39, 44 | 4.80 | 4 | 5 | 4 |
| `decree` | ?? | 6 | 12.50% | 3, 13, 23, 27, 37, 47 | 8.00 | 4 | 10 | 9 |
| `chest` | ?? | 4 | 8.33% | 4, 21, 28, 45 | 12.00 | 7 | 17 | 16 |
| `crime` | ??? | 4 | 8.33% | 8, 18, 32, 42 | 12.00 | 10 | 14 | 13 |
| `fortune` | ?? | 4 | 8.33% | 2, 24, 26, 40 | 12.00 | 2 | 22 | 21 |
| `gem` | ?? | 4 | 8.33% | 6, 19, 30, 43 | 12.00 | 11 | 13 | 12 |
| `bonus` | ? | 2 | 4.17% | 12, 36 | 24.00 | 24 | 24 | 23 |
| `dragon` | ?? | 2 | 4.17% | 17, 41 | 24.00 | 24 | 24 | 23 |
| `hazard` | ??/?? | 2 | 4.17% | 11, 35 | 24.00 | 24 | 24 | 23 |
| `raid` | ?? | 2 | 4.17% | 7, 31 | 24.00 | 24 | 24 | 23 |
| `recruit` | ??? | 2 | 4.17% | 14, 38 | 24.00 | 24 | 24 | 23 |
| `sprint` | ?? | 2 | 4.17% | 22, 46 | 24.00 | 24 | 24 | 23 |
| `wheel` | ?? | 2 | 4.17% | 9, 33 | 24.00 | 24 | 24 | 23 |
| `bless` | ?? | 1 | 2.08% | 16 | n/a | n/a | n/a | 47 |
| `go` | ?? | 1 | 2.08% | 0 | n/a | n/a | n/a | 47 |

## Tile Details

### `go` ??

- Count: 1 (2.08%).
- Indexes/positions: 0 (19.11, 0.00, 0.00).
- Reward/action: Gate/tax passage can collect taxes when crossed; landing grants about 50 x (tier+1) x realm growth coins.
- Realm-specific variation: Reward scales with realm growth RG(); visual realm changes theme.
- Multiplier interaction: No roll multiplier in formula; message may include multiplier tag only if active.
- Quest/weekly/battle/store/progression participation: Progression/economy; gate pass taxes when crossed.
- Spacing: average n/a, minimum gap n/a, maximum gap n/a, longest run without 47.

### `coin` ??

- Count: 10 (20.83%).
- Indexes/positions: 1 (19.17, 0.00, 2.20); 5 (13.49, 0.00, 8.68); 10 (3.56, 0.00, 13.16); 15 (-7.28, 0.00, 13.68); 20 (-16.49, 0.00, 9.98); 25 (-13.55, 0.45, -0.48); 29 (-12.57, 1.00, -9.21); 34 (-3.56, 0.00, -15.33); 39 (6.32, 0.00, -14.10); 44 (12.90, 0.00, -5.88).
- Reward/action: Grants random gold: (20, 30, 40, or 50) x multiplier x (tier+1) x realm growth x position multiplier.
- Realm-specific variation: Reward scales with RG(); higher tier/realm increases practical value.
- Multiplier interaction: Directly multiplied by S.multi.
- Quest/weekly/battle/store/progression participation: Coins quest via gain(); weekly indirectly through rolls spent, not landing.
- Spacing: average 4.80, minimum gap 4, maximum gap 5, longest run without 4.

### `fortune` ??

- Count: 4 (8.33%).
- Indexes/positions: 2 (18.39, 0.00, 4.27); 24 (-14.43, 0.06, 1.56); 26 (-13.24, 1.00, -2.66); 40 (7.36, 0.00, -12.14).
- Reward/action: Draws weighted fortune card; can grant coins, rolls, soldiers, blessing, jackpot, or lose coins/soldiers/rolls.
- Realm-specific variation: Coin outcomes scale with tier and RG(); soldiers/rolls fixed by card.
- Multiplier interaction: Many positive coin cards use multiplier; rolls/soldiers/losses usually do not.
- Quest/weekly/battle/store/progression participation: May affect coins/rolls/soldiers/blessing; store currency economy indirectly.
- Spacing: average 12.00, minimum gap 2, maximum gap 22, longest run without 21.

### `decree` ??

- Count: 6 (12.50%).
- Indexes/positions: 3 (17.03, 0.00, 6.02); 13 (-3.01, 0.00, 12.47); 23 (-15.43, 0.00, 3.54); 27 (-13.32, 1.39, -4.88); 37 (2.82, 0.00, -16.66); 47 (18.21, 0.00, -2.02).
- Reward/action: Starts royal decree choice event; affects kingdom policies/economy depending on selected decree.
- Realm-specific variation: Decree choices affect kingdom economy; presentation is not realm-specific.
- Multiplier interaction: No direct multiplier interaction in tile landing.
- Quest/weekly/battle/store/progression participation: Progression/economy choice system.
- Spacing: average 8.00, minimum gap 4, maximum gap 10, longest run without 9.

### `chest` ??

- Count: 4 (8.33%).
- Indexes/positions: 4 (15.34, 0.00, 7.45); 21 (-16.67, 0.00, 7.78); 28 (-13.22, 1.39, -7.10); 45 (14.89, 0.00, -4.91).
- Reward/action: Spawns tappable royal chest; grants gold and rolls after opening.
- Realm-specific variation: Gold scales with RG() and tier; rolls scale with tier.
- Multiplier interaction: Gold and extra rolls improve with multiplier.
- Quest/weekly/battle/store/progression participation: Reward interaction; coins quest via gain(); can add rolls.
- Spacing: average 12.00, minimum gap 7, maximum gap 17, longest run without 16.

### `gem` ??

- Count: 4 (8.33%).
- Indexes/positions: 6 (11.60, 0.00, 9.85); 19 (-15.51, 0.00, 11.96); 30 (-11.27, 0.45, -10.99); 43 (10.86, 0.00, -6.76).
- Reward/action: Grants about 80 x multiplier x (tier+1) x realm growth x position multiplier coins and advances gem quest.
- Realm-specific variation: Scales with RG(); quest-specific gem progress.
- Multiplier interaction: Directly multiplied by S.multi.
- Quest/weekly/battle/store/progression participation: Explicit gem quest progress.
- Spacing: average 12.00, minimum gap 11, maximum gap 13, longest run without 12.

### `raid` ??

- Count: 2 (4.17%).
- Indexes/positions: 7 (9.73, 0.00, 11.05); 31 (-9.50, 0.06, -12.33).
- Reward/action: Starts raid/battle minigame scaled by multiplier x (tier+1).
- Realm-specific variation: Scale uses multiplier x tier; broader battle context depends on current army/economy.
- Multiplier interaction: Battle scale uses S.multi.
- Quest/weekly/battle/store/progression participation: Battle system.
- Spacing: average 24.00, minimum gap 24, maximum gap 24, longest run without 23.

### `crime` ???

- Count: 4 (8.33%).
- Indexes/positions: 8 (7.83, 0.00, 12.19); 18 (-13.79, 0.00, 13.34); 32 (-7.54, 0.00, -13.36); 42 (9.09, 0.00, -8.07).
- Reward/action: Triggers thief/crime event; can steal coins based on crime rate and grants rolls while reducing crime.
- Realm-specific variation: Depends on current crime/tax economy, not tile realm art.
- Multiplier interaction: No direct multiplier interaction.
- Quest/weekly/battle/store/progression participation: Crime/tax economy.
- Spacing: average 12.00, minimum gap 10, maximum gap 14, longest run without 13.

### `wheel` ??

- Count: 2 (4.17%).
- Indexes/positions: 9 (5.76, 0.00, 12.98); 33 (-5.53, 0.00, -14.32).
- Reward/action: Starts Wheel of Fortune interaction scaled by multiplier and tier.
- Realm-specific variation: Scaled by multiplier and tier.
- Multiplier interaction: Wheel scale uses S.multi.
- Quest/weekly/battle/store/progression participation: Reward interaction.
- Spacing: average 24.00, minimum gap 24, maximum gap 24, longest run without 23.

### `hazard` ??/??

- Count: 2 (4.17%).
- Indexes/positions: 11 (1.37, 0.00, 12.81); 35 (-1.53, 0.00, -16.24).
- Reward/action: Starts random disaster: fire/plague/flood/bandits; loses coins or rolls.
- Realm-specific variation: Coin loss cap scales with tier and RG(); disaster text varies randomly.
- Multiplier interaction: No direct multiplier interaction.
- Quest/weekly/battle/store/progression participation: Penalty/risk event.
- Spacing: average 24.00, minimum gap 24, maximum gap 24, longest run without 23.

### `bonus` ?

- Count: 2 (4.17%).
- Indexes/positions: 12 (-0.81, 0.00, 12.35); 36 (0.61, 0.00, -16.79).
- Reward/action: Adds 2 x multiplier rolls immediately.
- Realm-specific variation: No realm-specific variation.
- Multiplier interaction: Roll reward is 2 x S.multi.
- Quest/weekly/battle/store/progression participation: Roll economy.
- Spacing: average 24.00, minimum gap 24, maximum gap 24, longest run without 23.

### `recruit` ???

- Count: 2 (4.17%).
- Indexes/positions: 14 (-5.15, 0.00, 13.07); 38 (4.81, 0.00, -15.71).
- Reward/action: Adds 3 + tier x 2 soldiers.
- Realm-specific variation: Soldier reward scales by current tier.
- Multiplier interaction: No direct multiplier interaction.
- Quest/weekly/battle/store/progression participation: Soldier/battle preparation.
- Spacing: average 24.00, minimum gap 24, maximum gap 24, longest run without 23.

### `bless` ??

- Count: 1 (2.08%).
- Indexes/positions: 16 (-9.47, 0.00, 14.05).
- Reward/action: Unlocks higher multipliers x10/x20 by setting blessed=true.
- Realm-specific variation: No realm-specific variation.
- Multiplier interaction: Enables higher multiplier ceiling.
- Quest/weekly/battle/store/progression participation: Multiplier progression.
- Spacing: average n/a, minimum gap n/a, maximum gap n/a, longest run without 47.

### `dragon` ??

- Count: 2 (4.17%).
- Indexes/positions: 17 (-11.68, 0.00, 14.00); 41 (8.12, 0.00, -10.06).
- Reward/action: Starts dragon battle scaled by multiplier x (tier+1); victory grants hoard and dragon-slayer boon.
- Realm-specific variation: Scale uses multiplier x tier; breed cycles by dragonSlain, not realm.
- Multiplier interaction: Dragon scale/per-tap reward uses S.multi.
- Quest/weekly/battle/store/progression participation: Battle system; dragon-slayer progression/boon.
- Spacing: average 24.00, minimum gap 24, maximum gap 24, longest run without 23.

### `sprint` ??

- Count: 2 (4.17%).
- Indexes/positions: 22 (-16.24, 0.00, 5.61); 46 (16.72, 0.00, -3.65).
- Reward/action: Moves ahead 1 to 3 extra spaces.
- Realm-specific variation: No realm-specific variation.
- Multiplier interaction: No direct multiplier interaction.
- Quest/weekly/battle/store/progression participation: Movement/progression; can skip/advance toward other spaces.
- Spacing: average 24.00, minimum gap 24, maximum gap 24, longest run without 23.

## Frequency Highlights

- dragon-space frequency: 2/48 (4.17%); indexes 17, 41.
- raid-space frequency: 2/48 (4.17%); indexes 7, 31.
- chest-space frequency: 4/48 (8.33%); indexes 4, 21, 28, 45.
- coin-space frequency: 10/48 (20.83%); indexes 1, 5, 10, 15, 20, 25, 29, 34, 39, 44.
- gem-space frequency: 4/48 (8.33%); indexes 6, 19, 30, 43.
- fortune-space frequency: 4/48 (8.33%); indexes 2, 24, 26, 40.
- hazard-space frequency: 2/48 (4.17%); indexes 11, 35.
- bonus-space frequency: 2/48 (4.17%); indexes 12, 36.
- recruit-space frequency: 2/48 (4.17%); indexes 14, 38.
- bless-space frequency: 1/48 (2.08%); indexes 16.
- Battle-space frequency: 4/48 (8.33%); raid + dragon combined.
- Build-space frequency: 0/48 (0.00%); there is no board tile type for building.
- Coin/reward-space frequency: 30/48 (62.50%) using broad positive/reward category.

## Balance Observations

- Dragon battles are difficult to trigger naturally because `dragon` appears only twice on a 48-space loop (4.17%), and movement is dice/random-roll driven; one instance is at index 17 and the next at 41, with a 24-space circular gap.
- `coin` is the most common direct reward space at ten positions (20.83%), creating reliable baseline currency pacing.
- `go` and `bless` are the rarest fixed progression spaces at one each (2.08%). `bless` being single-instance makes high multiplier unlock feel intentionally rare.
- The repeated 24-entry sequence creates strong regularity: most repeated special spaces recur every 24 spaces, so dry streaks are predictable.
- `raid` and `dragon` combined provide four battle spaces (8.33%). This is enough for occasional combat but sparse compared with general reward spaces.
- No build tile exists in the current board data; building is driven by the HUD/build panel and build counts, not a board-space type.
- Notable clustering: indexes 15-20 place `fortune`, `bless`, `dragon`, `crime`, `gem`, `coin` close together, creating a high-impact arc after the first third of the loop.
- Long dry streaks: single-instance `bless` and `go` each have a 48-space circular return; `dragon`, `raid`, `chest`, `gem`, `wheel`, `bonus`, `recruit`, and `hazard` generally have 24-space return spacing.
