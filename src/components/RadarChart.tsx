import { motion } from "framer-motion";

interface RadarChartProps {
  skills: number;
  seniority: number;
  domain: number;
  tier: 1 | 2 | 3 | 4;
}

const TIER_COLORS: Record<1 | 2 | 3 | 4, string> = {
  1: "#10b981",
  2: "#06b6d4",
  3: "#f59e0b",
  4: "#71717a",
};

const R = 88;
const cx = 150;
const cy = 138;

// Equilateral triangle vertices: top (Skills), bottom-right (Domain), bottom-left (Seniority)
const cos30 = Math.cos(Math.PI / 6);
const sin30 = Math.sin(Math.PI / 6);

function outerVertex(angle: number) {
  return {
    x: cx + R * Math.cos(angle),
    y: cy + R * Math.sin(angle),
  };
}

const vertices = [
  outerVertex(-Math.PI / 2),               // top: Skills
  outerVertex(-Math.PI / 2 + (2 * Math.PI) / 3),  // bottom-right: Domain
  outerVertex(-Math.PI / 2 + (4 * Math.PI) / 3),  // bottom-left: Seniority
];

function scorePoint(score: number, vertexIndex: number) {
  const t = score / 100;
  return {
    x: cx + t * (vertices[vertexIndex].x - cx),
    y: cy + t * (vertices[vertexIndex].y - cy),
  };
}

function toPoints(pts: { x: number; y: number }[]) {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export function RadarChart({ skills, seniority, domain, tier }: RadarChartProps) {
  const color = TIER_COLORS[tier];

  const rings = [0.25, 0.5, 0.75, 1].map((t) =>
    vertices.map((v) => ({ x: cx + t * (v.x - cx), y: cy + t * (v.y - cy) }))
  );

  const scorePts = [
    scorePoint(skills, 0),
    scorePoint(domain, 1),
    scorePoint(seniority, 2),
  ];

  return (
    <svg viewBox="0 0 300 272" className="w-full max-w-[260px] mx-auto">
      {/* Grid rings */}
      {rings.map((ring, i) => (
        <polygon
          key={i}
          points={toPoints(ring)}
          fill="none"
          stroke={i === 3 ? "#3f3f46" : "#27272a"}
          strokeWidth={i === 3 ? 1 : 0.75}
        />
      ))}

      {/* Axis spokes */}
      {vertices.map((v, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={v.x}
          y2={v.y}
          stroke="#3f3f46"
          strokeWidth="0.75"
          strokeDasharray="3,3"
        />
      ))}

      {/* Score fill */}
      <motion.polygon
        points={toPoints(scorePts)}
        fill={color}
        fillOpacity={0.18}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {/* Score dots */}
      {scorePts.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill={color}
          stroke="#0a0a0a"
          strokeWidth="2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
          style={{ transformOrigin: `${p.x}px ${p.y}px` }}
        />
      ))}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={2} fill="#3f3f46" />

      {/* Axis labels */}
      {/* Skills - top */}
      <text
        x={cx}
        y={vertices[0].y - 14}
        textAnchor="middle"
        fill="#a1a1aa"
        fontSize="11"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="500"
      >
        Skills
      </text>
      <text
        x={cx}
        y={vertices[0].y - 3}
        textAnchor="middle"
        fill={color}
        fontSize="12"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
      >
        {skills}
      </text>

      {/* Domain - bottom right */}
      <text
        x={vertices[1].x + 10}
        y={vertices[1].y - 5}
        textAnchor="start"
        fill="#a1a1aa"
        fontSize="11"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="500"
      >
        Domain
      </text>
      <text
        x={vertices[1].x + 10}
        y={vertices[1].y + 9}
        textAnchor="start"
        fill={color}
        fontSize="12"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
      >
        {domain}
      </text>

      {/* Seniority - bottom left */}
      <text
        x={vertices[2].x - 10}
        y={vertices[2].y - 5}
        textAnchor="end"
        fill="#a1a1aa"
        fontSize="11"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="500"
      >
        Seniority
      </text>
      <text
        x={vertices[2].x - 10}
        y={vertices[2].y + 9}
        textAnchor="end"
        fill={color}
        fontSize="12"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
      >
        {seniority}
      </text>
    </svg>
  );
}
