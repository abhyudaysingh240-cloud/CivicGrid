import React from 'react';

/**
 * CityScene Component (Task 3 - Expanded View)
 * Large-scale decorative isometric 3D smart-city digital twin illustration.
 * aria-hidden="true" and pointer-events: none ensures zero impact on usability and screen readers.
 */
export const CityScene: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="w-full rounded-2xl bg-[#1a1414] border border-[#3e3030] p-4 sm:p-6 shadow-2xl overflow-hidden relative select-none flex flex-col justify-between city-scene-panel"
      style={{ pointerEvents: 'none' }}
    >
      {/* Background ambient gradient glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#C0392B]/15 via-transparent to-[#38bdf8]/8 pointer-events-none" />

      {/* Pinned Top Telemetry Status Line */}
      <div className="relative z-10 flex items-center justify-between mb-2 px-2 text-[11px] font-mono tracking-wider text-[#A08888] shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-slate-200 font-bold uppercase tracking-wider text-xs">Roorkee Urban Grid Twin</span>
          <span className="text-slate-500 hidden sm:inline font-medium">| LIVE TELEMETRY</span>
        </div>
        <div className="text-[10px] font-mono text-[#A08888] hidden sm:block">
          STATUS: <span className="text-emerald-400 font-bold">OPTIMAL (49.98 Hz)</span>
        </div>
      </div>

      {/* Scaled Isometric SVG Canvas (Fills ~90% of panel width & height) */}
      <div className="w-full flex-1 flex justify-center items-center overflow-hidden min-h-0">
        <svg
          viewBox="0 0 1000 450"
          className="w-full h-full max-h-[540px] city-ambient-glow"
          preserveAspectRatio="xMidYMid meet"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Route line glowing gradient */}
            <linearGradient id="routeGlowGradLarge" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C0392B" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#F4AFA5" stopOpacity="1" />
              <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.9" />
            </linearGradient>

            {/* Building Top Gradients */}
            <linearGradient id="roofTallTower" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7E332B" />
              <stop offset="100%" stopColor="#4A1D18" />
            </linearGradient>
            <linearGradient id="roofHighBuilding" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#524040" />
              <stop offset="100%" stopColor="#362929" />
            </linearGradient>
            <linearGradient id="roofStandard" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3E3030" />
              <stop offset="100%" stopColor="#2A1F1F" />
            </linearGradient>
            <linearGradient id="roofSubtleDark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#322626" />
              <stop offset="100%" stopColor="#221919" />
            </linearGradient>
          </defs>

          {/* ── Ground Isometric Grid Lines (Wide Coverage) ── */}
          <g stroke="#2F2323" strokeWidth="1.2" strokeOpacity="0.65">
            <line x1="60" y1="210" x2="480" y2="420" />
            <line x1="160" y1="150" x2="580" y2="360" />
            <line x1="260" y1="90" x2="680" y2="300" />
            <line x1="360" y1="30" x2="780" y2="240" />
            <line x1="460" y1="-30" x2="880" y2="180" />
            <line x1="560" y1="-90" x2="980" y2="120" />

            <line x1="60" y1="210" x2="560" y2="-90" />
            <line x1="160" y1="270" x2="660" y2="-30" />
            <line x1="260" y1="330" x2="760" y2="30" />
            <line x1="360" y1="390" x2="860" y2="90" />
            <line x1="480" y1="420" x2="980" y2="120" />
          </g>

          {/* ── Secondary Feeder Loop (Cyan dashed) ── */}
          <path
            d="M 140 260 L 250 320 L 410 240 L 580 325 L 750 245 L 850 300 L 680 180 L 480 230 Z"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeDasharray="6 6"
            strokeOpacity="0.6"
          />

          {/* ── Primary 220kV Trunk Line (Glowing Dashoffset Animation) ── */}
          <path
            d="M 110 230 L 220 290 L 330 230 L 480 305 L 610 215 L 750 285 L 890 205"
            stroke="url(#routeGlowGradLarge)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="city-route-line"
          />

          {/* ── Buildings (Wider spread & significantly taller heights) ── */}

          {/* Building 1: Far West Switching Station (x: 100, y: 220) */}
          <g className="city-bldg" style={{ animationDelay: '40ms' }}>
            <polygon points="75,185 110,205 110,250 75,230" fill="#261C1C" />
            <polygon points="110,205 145,185 145,230 110,250" fill="#1C1414" />
            <polygon points="75,185 110,165 145,185 110,205" fill="url(#roofSubtleDark)" stroke="#453232" strokeWidth="0.8" />
          </g>

          {/* Building 2: West Primary Substation (x: 180, y: 190) - Taller (120px) */}
          <g className="city-bldg" style={{ animationDelay: '90ms' }}>
            <polygon points="145,140 185,165 185,260 145,235" fill="#2E2121" />
            <polygon points="185,165 225,140 225,235 185,260" fill="#221818" />
            <polygon points="145,140 185,115 225,140 185,165" fill="url(#roofHighBuilding)" stroke="#5A4040" strokeWidth="0.8" />
            {/* Illuminated window lines */}
            <line x1="160" y1="160" x2="160" y2="215" stroke="#C0392B" strokeWidth="1.5" strokeOpacity="0.75" />
            <line x1="172" y1="167" x2="172" y2="222" stroke="#F4AFA5" strokeWidth="1.5" strokeOpacity="0.8" />
          </g>

          {/* Building 3: Vardhmanpuram Feeder Station (x: 270, y: 250) - Mid-rise */}
          <g className="city-bldg" style={{ animationDelay: '150ms' }}>
            <polygon points="235,200 275,225 275,305 235,280" fill="#2A1E1E" />
            <polygon points="275,225 315,200 315,280 275,305" fill="#1E1515" />
            <polygon points="235,200 275,175 315,200 275,225" fill="url(#roofStandard)" stroke="#4E3838" strokeWidth="0.8" />
          </g>

          {/* Building 4: 220kV PTCUL Substation Roorkee (x: 340, y: 170) - Tall step-up (150px) */}
          <g className="city-bldg" style={{ animationDelay: '210ms' }}>
            <polygon points="300,105 345,135 345,255 300,225" fill="#362525" />
            <polygon points="345,135 390,105 390,225 345,255" fill="#261A1A" />
            <polygon points="300,105 345,75 390,105 345,135" fill="url(#roofHighBuilding)" stroke="#604444" strokeWidth="1" />
            {/* Status indicator bar */}
            <line x1="320" y1="95" x2="365" y2="120" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
          </g>

          {/* Building 5: CENTRAL COER UNIVERSITY DIGITAL TWIN TOWER (Tallest Hub, 240px tall!) */}
          <g className="city-bldg" style={{ animationDelay: '270ms' }}>
            {/* Left face */}
            <polygon points="425,50 480,88 480,290 425,252" fill="#3D2929" />
            {/* Right face */}
            <polygon points="480,88 535,50 535,252 480,290" fill="#2C1D1D" />
            {/* Lit Top face */}
            <polygon points="425,50 480,12 535,50 480,88" fill="url(#roofTallTower)" stroke="#C0392B" strokeWidth="1.8" />
            
            {/* Tall Spire & Pulsing Antenna Beacon */}
            <line x1="480" y1="12" x2="480" y2="-18" stroke="#F4AFA5" strokeWidth="2.5" />
            <circle cx="480" cy="-18" r="3.5" fill="#C0392B" />
            <circle cx="480" cy="-18" r="8" className="city-pulse-ring" fill="none" stroke="#C0392B" strokeWidth="1.5" />

            {/* Lit matrix windows */}
            <rect x="440" y="80" width="5" height="6" fill="#F4AFA5" opacity="0.9" />
            <rect x="455" y="90" width="5" height="6" fill="#F4AFA5" opacity="0.95" />
            <rect x="440" y="105" width="5" height="6" fill="#38bdf8" opacity="0.85" />
            <rect x="455" y="115" width="5" height="6" fill="#38bdf8" opacity="0.9" />
            <rect x="440" y="130" width="5" height="6" fill="#F4AFA5" opacity="0.9" />
            <rect x="455" y="140" width="5" height="6" fill="#F4AFA5" opacity="0.8" />
            <rect x="440" y="155" width="5" height="6" fill="#38bdf8" opacity="0.85" />
            <rect x="455" y="165" width="5" height="6" fill="#38bdf8" opacity="0.9" />
            <rect x="440" y="180" width="5" height="6" fill="#F4AFA5" opacity="0.8" />
            <rect x="455" y="190" width="5" height="6" fill="#F4AFA5" opacity="0.75" />
          </g>

          {/* Building 6: Civil Hospital Trauma Center (x: 580, y: 220) - Tall (180px) */}
          <g className="city-bldg" style={{ animationDelay: '330ms' }}>
            <polygon points="535,115 585,150 585,295 535,260" fill="#322424" />
            <polygon points="585,150 635,115 635,260 585,295" fill="#241919" />
            <polygon points="535,115 585,80 635,115 585,150" fill="url(#roofHighBuilding)" stroke="#5A4040" strokeWidth="1" />
            {/* Medical priority beacon */}
            <circle cx="585" cy="80" r="3" fill="#38bdf8" />
            <line x1="555" y1="130" x2="575" y2="144" stroke="#F4AFA5" strokeWidth="2" strokeLinecap="round" />
            <line x1="555" y1="150" x2="575" y2="164" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
            <line x1="555" y1="170" x2="575" y2="184" stroke="#F4AFA5" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Building 7: Piran Kaliyar Transmission Terminal (x: 680, y: 175) - Tall (160px) */}
          <g className="city-bldg" style={{ animationDelay: '390ms' }}>
            <polygon points="640,95 685,125 685,255 640,225" fill="#2E2020" />
            <polygon points="685,125 730,95 730,225 685,255" fill="#211616" />
            <polygon points="640,95 685,65 730,95 685,125" fill="url(#roofStandard)" stroke="#523A3A" strokeWidth="0.8" />
            <line x1="660" y1="120" x2="660" y2="180" stroke="#C0392B" strokeWidth="1.5" strokeOpacity="0.75" />
          </g>

          {/* Building 8: East Bhagwanpur Regional Substation (x: 770, y: 220) - Wide tall block */}
          <g className="city-bldg" style={{ animationDelay: '450ms' }}>
            <polygon points="730,130 775,160 775,290 730,260" fill="#2B1E1E" />
            <polygon points="775,160 820,130 820,260 775,290" fill="#1E1414" />
            <polygon points="730,130 775,100 820,130 775,160" fill="url(#roofHighBuilding)" stroke="#523A3A" strokeWidth="0.8" />
            <rect x="745" y="150" width="4" height="5" fill="#38bdf8" opacity="0.8" />
            <rect x="758" y="158" width="4" height="5" fill="#F4AFA5" opacity="0.85" />
            <rect x="745" y="170" width="4" height="5" fill="#38bdf8" opacity="0.8" />
            <rect x="758" y="178" width="4" height="5" fill="#F4AFA5" opacity="0.85" />
          </g>

          {/* Building 9: Far East Industrial Distribution Feeder (x: 870, y: 190) */}
          <g className="city-bldg" style={{ animationDelay: '510ms' }}>
            <polygon points="835,135 870,160 870,260 835,235" fill="#241A1A" />
            <polygon points="870,160 905,135 905,235 870,260" fill="#1A1212" />
            <polygon points="835,135 870,110 905,135 870,160" fill="url(#roofSubtleDark)" stroke="#453232" strokeWidth="0.8" />
          </g>

          {/* Building 10: North-East Intermediate Relay (x: 620, y: 90) */}
          <g className="city-bldg" style={{ animationDelay: '570ms' }}>
            <polygon points="590,50 625,75 625,145 590,120" fill="#271C1C" />
            <polygon points="625,75 660,50 660,120 625,145" fill="#1C1414" />
            <polygon points="590,50 625,25 660,50 625,75" fill="url(#roofSubtleDark)" stroke="#423030" strokeWidth="0.8" />
          </g>

          {/* ── Pulse Ping Rings at Grid Junctions (Scaled) ── */}
          <g>
            <circle cx="110" cy="230" r="4" fill="#C0392B" />
            <circle cx="110" cy="230" r="5" className="city-pulse-ring" fill="none" stroke="#C0392B" strokeWidth="1.5" />

            <circle cx="220" cy="290" r="4" fill="#38bdf8" />
            <circle cx="220" cy="290" r="5" className="city-pulse-ring" style={{ animationDelay: '0.5s' }} fill="none" stroke="#38bdf8" strokeWidth="1.5" />

            <circle cx="345" cy="135" r="4.5" fill="#C0392B" />
            <circle cx="345" cy="135" r="5" className="city-pulse-ring" style={{ animationDelay: '1.0s' }} fill="none" stroke="#C0392B" strokeWidth="1.5" />

            <circle cx="480" cy="305" r="4.5" fill="#F4AFA5" />
            <circle cx="480" cy="305" r="5" className="city-pulse-ring" style={{ animationDelay: '1.5s' }} fill="none" stroke="#F4AFA5" strokeWidth="1.5" />

            <circle cx="610" cy="215" r="4" fill="#38bdf8" />
            <circle cx="610" cy="215" r="5" className="city-pulse-ring" style={{ animationDelay: '0.8s' }} fill="none" stroke="#38bdf8" strokeWidth="1.5" />

            <circle cx="750" cy="285" r="4" fill="#C0392B" />
            <circle cx="750" cy="285" r="5" className="city-pulse-ring" style={{ animationDelay: '1.2s' }} fill="none" stroke="#C0392B" strokeWidth="1.5" />
          </g>

          {/* ── Floating Holographic Data Panels / Markers ── */}
          {/* Main Marker: Central COER University Campus Hub */}
          <g className="city-float-elem" transform="translate(480, -38)">
            <rect x="-42" y="-18" width="84" height="22" rx="4" fill="#1C1414" stroke="#C0392B" strokeWidth="1.2" opacity="0.95" />
            <circle cx="-30" cy="-7" r="2.5" fill="#22c55e" />
            <text x="2" y="-5" textAnchor="middle" fill="#F4AFA5" fontSize="9" fontFamily="monospace" fontWeight="bold">
              COER CAMPUS
            </text>
            <polygon points="-4,4 4,4 0,9" fill="#C0392B" />
          </g>

          {/* Floating Marker 2: Civil Hospital Priority Node */}
          <g className="city-float-elem-slow" transform="translate(585, 42)">
            <rect x="-35" y="-15" width="70" height="18" rx="3" fill="#161212" stroke="#38bdf8" strokeWidth="1" opacity="0.9" />
            <text x="0" y="-3" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
              CIVIL HOSP·P1
            </text>
            <polygon points="-3,3 3,3 0,7" fill="#38bdf8" />
          </g>

          {/* Floating Marker 3: PTCUL Master Substation */}
          <g className="city-float-elem" style={{ animationDelay: '0.6s' }} transform="translate(345, 40)">
            <rect x="-36" y="-15" width="72" height="18" rx="3" fill="#161212" stroke="#C0392B" strokeWidth="1" opacity="0.9" />
            <text x="0" y="-3" textAnchor="middle" fill="#F4AFA5" fontSize="8" fontFamily="monospace" fontWeight="bold">
              220kV PTCUL
            </text>
            <polygon points="-3,3 3,3 0,7" fill="#C0392B" />
          </g>

          {/* Floating 3D Data Cube: West Hub */}
          <g className="city-float-elem-slow" transform="translate(200, 70)">
            <polygon points="0,0 12,6 12,16 0,10" fill="#38bdf8" opacity="0.75" />
            <polygon points="12,6 24,0 24,10 12,16" fill="#0284c7" opacity="0.85" />
            <polygon points="0,0 12,-6 24,0 12,6" fill="#7dd3fc" opacity="0.95" />
          </g>

          {/* Floating 3D Data Cube: East Hub */}
          <g className="city-float-elem" style={{ animationDelay: '1.4s' }} transform="translate(800, 60)">
            <polygon points="0,0 10,5 10,13 0,8" fill="#F4AFA5" opacity="0.75" />
            <polygon points="10,5 20,0 20,8 10,13" fill="#C0392B" opacity="0.85" />
            <polygon points="0,0 10,-5 20,0 10,5" fill="#fca5a5" opacity="0.9" />
          </g>
        </svg>
      </div>
    </div>
  );
};
