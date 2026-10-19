import { useEffect, useId, useRef, useState } from 'react';
import './CarProgress.css';

// Scene geometry, in viewBox units (matches the 288×106 source clip).
const VIEW_W = 288;
const VIEW_H = 106;
const GROUND = 82;
const CARS = { red: 40, gray: 112, silver: 168, black: 241 };

// Determinate mode: the plate travels from the red SUV's bumper to the black SUV.
const PLATE_START = 74;
const PLATE_END = CARS.black; // battery rest point: centred under the black SUV
const plateX = (pct) => PLATE_START + ((PLATE_END - PLATE_START) * pct) / 100;
const xToPct = (x) => ((x - PLATE_START) / (PLATE_END - PLATE_START)) * 100;

// A car does its move when the plate passes under its centre.
const TRIGGERS = [
  { car: 'red', at: 0.5 },
  { car: 'gray', at: xToPct(CARS.gray) },
  { car: 'silver', at: xToPct(CARS.silver) },
  { car: 'black', at: 99.95 },
];

// Shared paint servers. `u` prefixes ids so several instances can share a page.
function Defs({ u }) {
  const lin = (id, stops, x2 = 0, y2 = 1) => (
    <linearGradient id={`${u}-${id}`} x1="0" y1="0" x2={x2} y2={y2}>
      {stops.map(([o, c, a = 1]) => <stop key={o} offset={o} stopColor={c} stopOpacity={a} />)}
    </linearGradient>
  );
  return (
    <defs>
      {lin('tire', [[0, '#3a3a3a'], [0.35, '#1a1a1a'], [1, '#050505']])}
      {lin('glass', [[0, '#4a5059'], [0.55, '#1b1e23'], [1, '#08090b']])}
      {lin('red', [[0, '#ee5a45'], [0.5, '#cf3624'], [1, '#8f1f14']])}
      {lin('red-dark', [[0, '#c4321f'], [1, '#7c1a10']])}
      {lin('gray', [[0, '#c4c6c9'], [0.45, '#9a9da2'], [1, '#64676c']])}
      {lin('silver', [[0, '#fbfbfc'], [0.5, '#dcdee1'], [1, '#a4a7ab']])}
      {lin('hood', [[0, '#ffffff'], [1, '#d9dbde']])}
      {lin('black', [[0, '#3a3b3e'], [0.4, '#18191b'], [1, '#050505']])}
      {lin('trim', [[0, '#2c2c2c'], [1, '#0b0b0b']])}
      {lin('line', [[0, '#c3c8ce', 0], [0.5, '#c3c8ce', 0.75], [1, '#c3c8ce', 0]], 1, 0)}
      {lin('steam', [[0, '#a9b0b9', 1], [0.5, '#c4cad1', 0.8], [1, '#dfe3e8', 0]])}
      <radialGradient id={`${u}-lamp`}>
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.6" stopColor="#fff3dc" />
        <stop offset="1" stopColor="#d8c39c" />
      </radialGradient>
      <filter id={`${u}-blur`} x="-150%" y="-50%" width="400%" height="250%">
        <feGaussianBlur stdDeviation="0.7" />
      </filter>
    </defs>
  );
}

const Tire = ({ u, x, w, h, r = 2 }) => (
  <rect x={x} y={-h} width={w} height={h} rx={r} fill={`url(#${u}-tire)`} />
);

// Boxy off-roader. Measured from the source: 42 wide incl. mirrors, 40.5 tall.
function RedSuv({ u }) {
  return (
    <>
      <Tire u={u} x={-20.5} w={7} h={7.5} r={2} />
      <Tire u={u} x={13.5} w={7} h={7.5} r={2} />
      {/* The body rolls on its suspension; the wheels stay planted. */}
      <g className="cp-body">
        {/* mirrors: round pods tucked against the cabin */}
        <ellipse cx="-18.6" cy="-30.8" rx="2.2" ry="2.6" fill={`url(#${u}-trim)`} />
        <ellipse cx="18.6" cy="-30.8" rx="2.2" ry="2.6" fill={`url(#${u}-trim)`} />
        {/* cabin: black frame with roof-corner bumps */}
        <path
          d="M-15.6 -29.4 L-14.8 -38.6 Q-14.6 -40.2 -13 -40.2 L-11.6 -40.9 Q-10.8 -41.3 -10 -40.6 L-9.4 -40 H9.4 L10 -40.6 Q10.8 -41.3 11.6 -40.9 L13 -40.2 Q14.6 -40.2 14.8 -38.6 L15.6 -29.4 Z"
          fill="#121212"
        />
        <path d="M-13.4 -30.2 L-12.8 -37.6 Q-12.7 -38.6 -11.7 -38.6 H11.7 Q12.7 -38.6 12.8 -37.6 L13.4 -30.2 Z" fill={`url(#${u}-glass)`} />
        {/* light rear window seen through the cabin */}
        <path
          d="M-6.4 -35.2 Q-6.6 -35.9 -5.8 -35.8 L-2.2 -35.1 L0 -33.6 L2.2 -35.1 L5.8 -35.8 Q6.6 -35.9 6.4 -35.2 L5.6 -31 Q5.4 -30.4 4.7 -30.5 L1.6 -30.9 L0 -31.9 L-1.6 -30.9 L-4.7 -30.5 Q-5.4 -30.4 -5.6 -31 Z"
          fill="#eef0f2"
        />
        <path d="M-12.2 -37.6 L-10.4 -37.6 L-12.4 -31 L-13 -31 Z" fill="#fff" opacity="0.14" />
        {/* black fender flares, wider than the body */}
        <path d="M-16.8 -25.4 L-20.6 -24 Q-21.3 -23.6 -21.3 -22.6 V-7 H-16.8 Z" fill={`url(#${u}-trim)`} />
        <path d="M16.8 -25.4 L20.6 -24 Q21.3 -23.6 21.3 -22.6 V-7 H16.8 Z" fill={`url(#${u}-trim)`} />
        {/* red upper (hood) band */}
        <path d="M-16.8 -24.4 V-28.4 Q-16.8 -29.6 -15.6 -29.6 H15.6 Q16.8 -29.6 16.8 -28.4 V-24.4 Z" fill={`url(#${u}-red)`} />
        <rect x="-15.8" y="-29.4" width="31.6" height="0.7" rx="0.35" fill="#fff" opacity="0.3" />
        {/* black grille band with headlight strips at the ends */}
        <rect x="-17" y="-24.6" width="34" height="3.4" fill="#141414" />
        <rect x="-16.2" y="-23.6" width="5" height="1.3" rx="0.6" fill="#e9e6df" />
        <rect x="11.2" y="-23.6" width="5" height="1.3" rx="0.6" fill="#e9e6df" />
        <rect x="-9.5" y="-23.2" width="19" height="0.5" fill="#3a3a3a" />
        <rect x="-2" y="-23.8" width="4" height="1.6" rx="0.4" fill="#2a2a2a" />
        {/* red lower panel, darker toward the bottom */}
        <rect x="-16.8" y="-21.4" width="33.6" height="6.2" fill={`url(#${u}-red-dark)`} />
        <rect x="-16" y="-20.9" width="32" height="0.5" fill="#fff" opacity="0.12" />
        {/* black bumper with skid plate and tow points */}
        <path d="M-20.8 -15.6 H20.8 Q21.4 -15.6 21.4 -15 V-8.2 Q21.4 -6.8 20 -6.8 H-20 Q-21.4 -6.8 -21.4 -8.2 V-15 Q-21.4 -15.6 -20.8 -15.6 Z" fill={`url(#${u}-trim)`} />
        <rect x="-8" y="-11.2" width="16" height="2.6" rx="0.8" fill="#2c2c2c" />
        <rect x="-13.6" y="-13.4" width="2.2" height="1.6" rx="0.5" fill="#3d3d3d" />
        <rect x="11.4" y="-13.4" width="2.2" height="1.6" rx="0.5" fill="#3d3d3d" />
      </g>
    </>
  );
}

// Mid-engine sports car. Measured from the source: 40.6 wide, 26.5 tall.
function GraySports({ u }) {
  return (
    <>
      <Tire u={u} x={-20} w={6.8} h={7} r={1.8} />
      <Tire u={u} x={13.2} w={6.8} h={7} r={1.8} />
      {/* teardrop mirrors at the canopy base */}
      <path d="M-14.2 -20.4 Q-16.5 -22.6 -19 -22.4 Q-20.6 -22.1 -20.4 -20.7 Q-20 -19.4 -18.4 -19.3 L-14.6 -19.2 Z" fill="#202124" />
      <path d="M14.2 -20.4 Q16.5 -22.6 19 -22.4 Q20.6 -22.1 20.4 -20.7 Q20 -19.4 18.4 -19.3 L14.6 -19.2 Z" fill="#202124" />
      {/* body: fenders at mirror height, near-vertical sides */}
      <path
        d="M-14.2 -19.2 Q-18.6 -18.8 -19.8 -16.8 Q-20.6 -15 -20.4 -10.8 L-20 -6.4 H20 L20.4 -10.8 Q20.6 -15 19.8 -16.8 Q18.6 -18.8 14.2 -19.2 Z"
        fill={`url(#${u}-gray)`}
        stroke="#2e2f32"
        strokeWidth="0.5"
      />
      {/* hood: lighter panel widening downward, with creases to the badge */}
      <path d="M-10 -19 H10 L13.4 -11.4 Q0 -10.4 -13.4 -11.4 Z" fill="#fff" opacity="0.17" />
      <path d="M-7.5 -19 L-3.4 -12.2 M7.5 -19 L3.4 -12.2" stroke="#6b6e73" strokeWidth="0.45" fill="none" />
      <path d="M-10 -19 L-13.4 -11.4 M10 -19 L13.4 -11.4" stroke="#55585d" strokeWidth="0.5" fill="none" />
      <path d="M-0.9 -13.3 L0 -12.2 L0.9 -13.3 L0 -14.2 Z" fill="#d8d8d8" />
      {/* long swept headlight wedges with vertical light strips at the outer edges */}
      <path d="M-19.8 -17.4 L-11.2 -12.2 L-12.4 -10.4 L-19.9 -12 Z" fill="#17181a" />
      <path d="M19.8 -17.4 L11.2 -12.2 L12.4 -10.4 L19.9 -12 Z" fill="#17181a" />
      <path d="M-18.9 -15.6 V-12.6 M18.9 -15.6 V-12.6" stroke="#eef0f2" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M-18 -16.2 L-12.4 -12.8 M18 -16.2 L12.4 -12.8" stroke="#c9ccd0" strokeWidth="0.45" strokeLinecap="round" />
      {/* wide black intake, arched up in the centre */}
      <path d="M-20 -10.9 Q-10 -9.4 0 -10.6 Q10 -9.4 20 -10.9 L20.2 -6.4 Q20 -4.8 18.2 -4.8 H-18.2 Q-20 -4.8 -20.2 -6.4 Z" fill="#0d0d0e" />
      <path d="M-13 -7.6 Q0 -8.6 13 -7.6" stroke="#2c2c2e" strokeWidth="0.6" fill="none" />
      <path d="M-19.2 -9.6 L-15.4 -9.2 L-16.4 -6.6 L-19.4 -6.8 Z M19.2 -9.6 L15.4 -9.2 L16.4 -6.6 L19.4 -6.8 Z" fill="#232326" />
      {/* dome canopy */}
      <path d="M-14.2 -19 Q-14 -24.2 -10.2 -26.2 Q-8.8 -26.9 -6.6 -26.9 H6.6 Q8.8 -26.9 10.2 -26.2 Q14 -24.2 14.2 -19 Q0 -20 -14.2 -19 Z" fill={`url(#${u}-glass)`} />
      <path d="M-9.4 -24.6 Q-5 -26 1.5 -26" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.7" fill="none" strokeLinecap="round" />
    </>
  );
}

function SilverLow({ u }) {
  return (
    <>
      <Tire u={u} x={-19} w={5.5} h={6.5} r={1.6} />
      <Tire u={u} x={13.5} w={5.5} h={6.5} r={1.6} />
      {/* thick black underbody band, the widest part */}
      <path d="M-21.5 -10.8 H21.5 Q22.4 -10.8 22.2 -9.3 L21.7 -4 Q21.4 -2.6 20.2 -2.6 H-20.2 Q-21.4 -2.6 -21.7 -4 L-22.2 -9.3 Q-22.4 -10.8 -21.5 -10.8 Z" fill={`url(#${u}-trim)`} />
      {/* body: narrow under the canopy, widening to the bottom */}
      <path
        d="M-11.8 -16.2 Q-16.4 -16 -18.6 -14.8 L-21.8 -12 Q-22.6 -10.6 -21.4 -10.2 H21.4 Q22.6 -10.6 21.8 -12 L18.6 -14.8 Q16.4 -16 11.8 -16.2 Z"
        fill={`url(#${u}-silver)`}
        stroke="#8a8d91"
        strokeWidth="0.45"
      />
      {/* flat light hood panel, wider at the bottom */}
      <path d="M-11.8 -15.7 H11.8 L17.6 -10.8 H-17.6 Z" fill={`url(#${u}-hood)`} stroke="#9fa2a6" strokeWidth="0.35" />
      {/* corner headlights */}
      <path d="M-21.7 -11.2 L-18.2 -14.5 L-16.6 -11 Z" fill="#35373a" />
      <path d="M21.7 -11.2 L18.2 -14.5 L16.6 -11 Z" fill="#35373a" />
      <path d="M-21 -11.6 L-18.3 -14 M21 -11.6 L18.3 -14" stroke="#fff" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M-15 -8.6 H15" stroke="#333" strokeWidth="0.6" />
      {/* canopy */}
      <path d="M-13.2 -15.8 L-10.2 -21 Q-9.2 -22.2 -7.2 -22.2 H7.2 Q9.2 -22.2 10.2 -21 L13.2 -15.8 Q0 -16.6 -13.2 -15.8 Z" fill={`url(#${u}-glass)`} />
      <path d="M-8.6 -20.6 Q-2.5 -21.6 4 -21.4" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.6" fill="none" strokeLinecap="round" />
    </>
  );
}

function BlackSuv({ u }) {
  return (
    <>
      <Tire u={u} x={-21} w={8} h={9.5} />
      <Tire u={u} x={13} w={8} h={9.5} />
      <path d="M-18 -25.4 L-24.4 -26.2 Q-25.4 -26.2 -25.4 -25.2 V-23.6 Q-25.4 -22.8 -24.4 -22.8 H-18.6 Z" fill="#101011" />
      <path d="M18 -25.4 L24.4 -26.2 Q25.4 -26.2 25.4 -25.2 V-23.6 Q25.4 -22.8 24.4 -22.8 H18.6 Z" fill="#101011" />
      <path
        d="M-23 -9 Q-24 -20 -19 -23 L-15 -33 Q-13 -37 -9 -37 H9 Q13 -37 15 -33 L19 -23 Q24 -20 23 -9 Q23 -6 20 -6 H-20 Q-23 -6 -23 -9 Z"
        fill={`url(#${u}-black)`}
      />
      <path d="M-14 -24 L-11 -33 Q-10 -34.6 -8 -34.6 H8 Q10 -34.6 11 -33 L14 -24 Q0 -25.6 -14 -24 Z" fill={`url(#${u}-glass)`} />
      <path d="M-8.5 -34 L-4.5 -34 L-8 -24.6 L-12.4 -24.4 Z" fill="#fff" opacity="0.12" />
      <ellipse cx="0" cy="-20.5" rx="13" ry="2.2" fill="#fff" opacity="0.07" />
      {/* slim LED headlights */}
      <path d="M-20.4 -19.6 L-12.6 -18.6 L-13 -17.6 L-20.2 -18.4 Z" fill="#d8dce1" />
      <path d="M20.4 -19.6 L12.6 -18.6 L13 -17.6 L20.2 -18.4 Z" fill="#d8dce1" />
      <circle cx="0" cy="-18" r="1" fill="#7a7a7a" />
      <rect x="-10" y="-12" width="20" height="2.6" rx="1.2" fill="#000" />
    </>
  );
}

const BODIES = { red: RedSuv, gray: GraySports, silver: SilverLow, black: BlackSuv };

// Two steam jets under the silver car. They move with the car.
function Steam({ u }) {
  return (
    <g className="cp-steam">
      {[-15.75, 15.75].map((x, i) => (
        <g key={x} transform={`translate(${x} -3)`} filter={`url(#${u}-blur)`}>
          <path d="M-1.6 0 L1.6 0 L3 12 L-3 12 Z" fill={`url(#${u}-steam)`} />
          {[0, 1, 2].map((p) => (
            <circle
              key={p}
              className="cp-steam__puff"
              cx="0"
              cy="2"
              r="1.5"
              style={{ '--pd': `${-0.15 * p}s`, '--dx':`${(i ? 1 : -1) * (p + 1) * 0.6}px` }}
            />
          ))}
        </g>
      ))}
    </g>
  );
}

/**
 * Car-themed progress indicator.
 *
 * - No `value` (undefined/null): indeterminate loop, recreating the source clip.
 * - `value` 0–100: determinate. The plate rides along the road to the value,
 *   and each car reacts as the plate passes under it.
 * - `time` (seconds, indeterminate only): freeze the loop at that moment.
 *   Used by the frame-by-frame comparison player.
 * - `motion`: 'smooth' interpolates between the source poses; 'stepped' holds
 *   each pose like the source clip (about 8 poses per second).
 */
export default function CarProgress({
  value,
  time,
  motion = 'smooth',
  size = 288,
  duration = 101 / 40.8, // the source clip: 101 frames at 40.8 fps
  label = 'Loading',
  className = '',
  style,
}) {
  const u = `cp${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const determinate = typeof value === 'number' && !Number.isNaN(value);
  const target = determinate ? Math.min(100, Math.max(0, value)) : 0;

  const plateRef = useRef(null);
  const fillRef = useRef(null);
  const shown = useRef(target);
  const [plays, setPlays] = useState({ red: 0, gray: 0, silver: 0, black: 0 });

  // Ease the plate toward the target and fire car moves on crossings.
  useEffect(() => {
    if (!determinate) return undefined;
    let raf;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const prev = shown.current;
      let next = prev + (target - prev) * Math.min(1, dt * 5);
      if (Math.abs(target - next) < 0.05) next = target;
      shown.current = next;

      const x = plateX(next);
      if (plateRef.current) plateRef.current.style.transform = `translateX(${x}px)`;
      if (fillRef.current) fillRef.current.setAttribute('x2', String(x));

      const fired = TRIGGERS.filter((t) => prev < t.at && next >= t.at).map((t) => t.car);
      if (fired.length) {
        setPlays((p) => {
          const n = { ...p };
          fired.forEach((car) => { n[car] += 1; });
          return n;
        });
      }
      if (next !== target) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [determinate, target]);

  const car = (name) => {
    const n = determinate ? plays[name] : 0;
    const Body = BODIES[name];
    return (
      <g transform={`translate(${CARS[name]} ${GROUND})`}>
        <g key={n} className={n ? 'cp-play' : undefined}>
          {/* Faint line on the road under the silver car, only while it is airborne. */}
          {name === 'silver' && <rect className="cp-shadow" x="-8" y="0.3" width="16" height="0.8" rx="0.4" fill={`url(#${u}-line)`} />}
          <g className={`cp-car cp-car--${name}`}>
            {name === 'silver' ? (
              <>
                <Steam u={u} />
                {/* Lift moves car + steam; spin turns only the car, about its own centre. */}
                <g className="cp-spin"><Body u={u} /></g>
              </>
            ) : (
              <Body u={u} />
            )}
          </g>
        </g>
      </g>
    );
  };

  const startX = plateX(shown.current);
  const frozen = !determinate && typeof time === 'number' && Number.isFinite(time);
  const modeClass = determinate
    ? 'cp--determinate'
    : `cp--indeterminate${frozen ? ' cp--frozen' : ''}${motion === 'stepped' ? ' cp--stepped' : ''}`;

  return (
    <div
      className={`cp ${modeClass} ${className}`}
      style={{
        '--cp-duration': `${duration}s`,
        ...(frozen ? { '--cp-t': `${time}s` } : null),
        width: size,
        ...style,
      }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      aria-valuenow={determinate ? Math.round(target) : undefined}
    >
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" aria-hidden="true">
        <Defs u={u} />

        {determinate && (
          <g className="cp-road">
            <line className="cp-road__track" x1={PLATE_START} x2={PLATE_END + 12} y1={GROUND + 6} y2={GROUND + 6} />
            <line ref={fillRef} className="cp-road__fill" x1={PLATE_START} x2={startX} y1={GROUND + 6} y2={GROUND + 6} />
          </g>
        )}

        {/* The plate (battery) is drawn first: it passes behind every car's wheels and slides up into the black SUV. */}
        <g transform={`translate(0 ${GROUND})`}>
          <g
            ref={plateRef}
            className="cp-plate"
            style={determinate ? { transform: `translateX(${startX}px)` } : undefined}
          >
            <rect x="-12" y="-5" width="24" height="5" rx="1.2" />
            <path d="M-8 -2.5 H8" className="cp-plate__text" />
          </g>
        </g>

        {car('red')}
        {car('gray')}
        {car('silver')}
        {car('black')}
      </svg>
    </div>
  );
}
