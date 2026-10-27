import { Droplets, FastForward, Play, RotateCcw, Sprout, Cherry } from 'lucide-react'
import { useState } from 'react'
import { CYCLE_MINUTES, DAYS_TO_GROW, NEXT_SUNRISE, PLANTS_PER_POT, STEPS, SUNRISE, useGarden } from '../../stores/useGarden.ts'
import { paintUniforms } from '../../materials/paintedMaterial.ts'

/** Panneau de test de la machine d'étapes, visible uniquement en développement */
export default function DevPanel() {
  const step = useGarden((s) => s.step)
  const pots = useGarden((s) => s.pots)
  const day = useGarden((s) => s.day)
  const minute = useGarden((s) => s.minute)
  const growth = useGarden((s) => s.growth)
  const harvested = useGarden((s) => s.harvested)
  const { start, seedPot, waterPot, advanceTime, harvestFruit, reset } = useGarden.getState()

  const [groundOpacity, setGroundOpacity] = useState(paintUniforms.uGroundOpacity.value)

  const hh = String(Math.floor((minute % 1440) / 60)).padStart(2, '0')
  const mm = String(Math.floor(minute % 60)).padStart(2, '0')

  const btn =
    'inline-flex items-center gap-1 rounded-md border border-accent/40 px-2 py-1 text-accent hover:bg-accent hover:text-cream-light disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-accent'

  return (
    <aside className="pointer-events-auto absolute bottom-3 left-3 z-30 w-72 rounded-xl bg-cream-light/90 p-3 text-xs shadow-lg ring-1 ring-track backdrop-blur">
      <p className="mb-2 font-bold uppercase tracking-widest text-label">Dev · machine d'étapes</p>

      <ol className="mb-3 flex flex-wrap gap-1">
        {STEPS.map((s) => (
          <li
            key={s}
            className={`rounded-full px-2 py-0.5 ${s === step ? 'bg-accent text-cream-light' : 'bg-track/60 text-ink/60'}`}
          >
            {s}
          </li>
        ))}
      </ol>

      <div className="mb-2 flex flex-wrap gap-1">
        <button className={btn} disabled={step !== 'intro'} onClick={start}>
          <Play size={12} /> start
        </button>
        <button className={btn} onClick={reset}>
          <RotateCcw size={12} /> reset
        </button>
      </div>

      <table className="mb-2 w-full text-left">
        <thead className="text-label">
          <tr>
            <th>Pot</th>
            <th>Semer</th>
            <th>Arroser</th>
            <th>Récolter</th>
          </tr>
        </thead>
        <tbody>
          {pots.map((p, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>
                <button className={btn} disabled={step !== 'sow' || p.seeded} onClick={() => seedPot(i)}>
                  <Sprout size={12} /> {p.seeded ? 'oui' : 'non'}
                </button>
              </td>
              <td>
                <button className={btn} disabled={step !== 'water' || p.watered} onClick={() => waterPot(i)}>
                  <Droplets size={12} /> {p.watered ? 'oui' : 'non'}
                </button>
              </td>
              <td className="flex gap-1">
                {Array.from({ length: PLANTS_PER_POT }, (_, plant) => {
                  const done = harvested.some((h) => h.pot === i && h.plant === plant)
                  return (
                    <button
                      key={plant}
                      className={btn}
                      disabled={step !== 'harvest' || done}
                      onClick={() => harvestFruit(i, plant)}
                    >
                      <Cherry size={12} />
                    </button>
                  )
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between gap-2">
        <span>
          Jour {day}/{DAYS_TO_GROW} · {hh}:{mm} · pousse {(growth * 100).toFixed(0)} %
        </span>
        <button className={btn} disabled={step !== 'wait'} onClick={() => advanceTime(CYCLE_MINUTES)}>
          <FastForward size={12} /> +1 j
        </button>
      </div>
      <p className="mt-1 text-label">Fruits récoltés : {harvested.length}</p>

      {/* aperçu du soleil : force l'heure, quelle que soit l'étape */}
      <label className="mt-2 flex items-center gap-2 text-label">
        Heure
        <input
          type="range"
          aria-label="Heure du soleil"
          className="flex-1 accent-accent"
          min={SUNRISE}
          max={NEXT_SUNRISE - 5}
          step={5}
          value={minute}
          onChange={(e) => useGarden.setState({ minute: Number(e.target.value) })}
        />
      </label>

      <label className="mt-1 flex items-center gap-2 text-label">
        Sol {Math.round(groundOpacity * 100)} %
        <input
          type="range"
          aria-label="Opacité du sol"
          className="flex-1 accent-accent"
          min={0.3}
          max={1}
          step={0.05}
          value={groundOpacity}
          onChange={(e) => {
            const v = Number(e.target.value)
            paintUniforms.uGroundOpacity.value = v
            setGroundOpacity(v)
          }}
        />
      </label>
    </aside>
  )
}
