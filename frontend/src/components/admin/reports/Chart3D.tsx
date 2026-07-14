import React from 'react';

interface BarData {
  label: string;
  value: number;
  color: string;
}

export const Chart3DBar: React.FC<{ data: BarData[]; height?: number }> = ({ data, height = 240 }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = Math.floor(400 / data.length) - 10;

  return (
    <svg width="100%" height={height} viewBox="0 0 500 240" style={{ marginTop: '12px' }}>
      {/* 3D effect: shadow bars */}
      {data.map((item, idx) => {
        const yPos = 200 - (item.value / maxValue) * 150;
        const xPos = 50 + idx * (barWidth + 10);
        return (
          <g key={`shadow-${idx}`}>
            {/* Shadow (3D depth) */}
            <rect
              x={xPos + 3}
              y={yPos + 3}
              width={barWidth}
              height={200 - yPos}
              fill="#00000015"
              rx="3"
            />
            {/* Main bar with gradient */}
            <defs key={`grad-${idx}`}>
              <linearGradient id={`grad${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={item.color} stopOpacity="1" />
                <stop offset="100%" stopColor={item.color} stopOpacity="0.7" />
              </linearGradient>
            </defs>
            {/* Beveled 3D effect */}
            <rect
              x={xPos}
              y={yPos}
              width={barWidth}
              height={200 - yPos}
              fill={`url(#grad${idx})`}
              rx="3"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
            />
            {/* Top highlight for 3D */}
            <rect
              x={xPos}
              y={yPos}
              width={barWidth}
              height="3"
              fill="white"
              opacity="0.4"
              rx="2"
            />
            {/* Label */}
            <text
              x={xPos + barWidth / 2}
              y="220"
              fontSize="11"
              textAnchor="middle"
              fill="#333"
              fontWeight="500"
            >
              {item.label}
            </text>
            {/* Value on top */}
            <text
              x={xPos + barWidth / 2}
              y={yPos - 8}
              fontSize="12"
              textAnchor="middle"
              fill={item.color}
              fontWeight="700"
            >
              {item.value}
            </text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1="40" y1="20" x2="40" y2="200" stroke="#ddd" strokeWidth="2"/>
      <line x1="40" y1="200" x2="480" y2="200" stroke="#ddd" strokeWidth="2"/>
    </svg>
  );
};

export const Chart3DPie: React.FC<{ data: Array<{ label: string; value: number; color: string }> }> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  const slices = data.map((item, idx) => {
    const sliceAngle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    const radius = 80;
    const x1 = 120 + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = 140 + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = 120 + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = 140 + radius * Math.sin((endAngle * Math.PI) / 180);

    const largeArc = sliceAngle > 180 ? 1 : 0;

    const path = `M 120 140 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    currentAngle += sliceAngle;

    return { path, color: item.color, label: item.label, value: item.value, percent: ((item.value / total) * 100).toFixed(1) };
  });

  return (
    <svg width="100%" height="280" viewBox="0 0 400 280" style={{ marginTop: '12px' }}>
      {/* 3D shadow effect */}
      {slices.map((slice, idx) => (
        <g key={`shadow-${idx}`}>
          <path
            d={slice.path}
            fill="#00000010"
            transform="translate(2, 2)"
          />
        </g>
      ))}

      {/* Pie slices */}
      {slices.map((slice, idx) => (
        <g key={idx}>
          <path
            d={slice.path}
            fill={slice.color}
            opacity="0.85"
            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))' }}
          />
          {/* Slice highlight */}
          <path
            d={slice.path}
            fill="white"
            opacity="0.15"
            style={{ pointerEvents: 'none' }}
          />
        </g>
      ))}

      {/* Center circle for donut effect */}
      <circle cx="120" cy="140" r="50" fill="#fff" stroke="#ffb88c" strokeWidth="1"/>
      <text x="120" y="145" fontSize="14" fontWeight="700" textAnchor="middle" fill="#FF6B35">
        {data[0]?.value}
      </text>

      {/* Legend with 3D effect */}
      {slices.map((slice, idx) => (
        <g key={`legend-${idx}`}>
          {/* Legend background */}
          <rect
            x="220"
            y={30 + idx * 30}
            width="170"
            height="25"
            fill="white"
            stroke={slice.color}
            strokeWidth="1.5"
            rx="4"
            opacity="0.95"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
          />
          <rect x="225" y={35 + idx * 30} width="12" height="12" fill={slice.color} rx="2"/>
          <text x="242" y={44 + idx * 30} fontSize="11" fill="#333" fontWeight="500">
            {slice.label} ({slice.percent}%)
          </text>
        </g>
      ))}
    </svg>
  );
};

export const Chart3DLine: React.FC<{
  data: Array<{ label: string; value: number }>;
  title: string;
}> = ({ data, title }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const points = data.map((item, idx) => {
    const x = 60 + (idx / (data.length - 1)) * 700;
    const y = 260 - (item.value / maxValue) * 220;
    return { x, y, ...item };
  });

  const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width="100%" height="300" viewBox="0 0 800 300" style={{ marginTop: '12px' }}>
      {/* Grid background */}
      <defs>
        <pattern id="grid3d" width="80" height="40" patternUnits="userSpaceOnUse">
          <path d="M 80 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="800" height="300" fill="url(#grid3d)"/>

      {/* Axes with 3D effect */}
      <line x1="40" y1="280" x2="780" y2="280" stroke="#999" strokeWidth="2"/>
      <line x1="40" y1="20" x2="40" y2="280" stroke="#999" strokeWidth="2"/>

      {/* Area fill (gradient) for 3D effect */}
      <defs>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#FF6B35" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path
        d={`${pathD} L 780 280 L 60 280 Z`}
        fill="url(#areaGradient)"
      />

      {/* Main line with shadow */}
      <path
        d={pathD}
        fill="none"
        stroke="#FF6B3520"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d={pathD}
        fill="none"
        stroke="#FF6B35"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Data points with 3D effect */}
      {points.map((p, idx) => (
        <g key={idx}>
          {/* Shadow circle */}
          <circle cx={p.x} cy={p.y} r="5" fill="#00000015"/>
          {/* Main circle with gradient */}
          <defs key={`pt-${idx}`}>
            <radialGradient id={`ptGrad${idx}`}>
              <stop offset="0%" stopColor="#FF6B35"/>
              <stop offset="100%" stopColor="#ff5722"/>
            </radialGradient>
          </defs>
          <circle cx={p.x} cy={p.y} r="4" fill={`url(#ptGrad${idx})`}/>
          {/* Highlight for 3D */}
          <circle cx={p.x - 1.5} cy={p.y - 1.5} r="1.5" fill="white" opacity="0.6"/>
        </g>
      ))}

      {/* Y-axis labels */}
      <text x="30" y="285" fontSize="11" textAnchor="end" fill="#999">0</text>
      <text x="30" y="210" fontSize="11" textAnchor="end" fill="#999">{(maxValue / 2).toFixed(0)}</text>
      <text x="30" y="135" fontSize="11" textAnchor="end" fill="#999">{maxValue}</text>
    </svg>
  );
};
