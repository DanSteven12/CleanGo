// frontend/src/components/auth/TechOrbitDisplay.tsx
import React from 'react';
import { motion } from 'framer-motion';
import {
  Truck,
  MapPin,
  Navigation,
  Container,
  Building2,
  Map,
  Recycle,
  BarChart3,
  Monitor,
} from 'lucide-react';

import iconoCamion from '../../assets/images/icono.png';

// ─── CleanGo orbit items ─────────────────────────────────────────────────────
const ORBIT_ITEMS = [
  { icon: Truck, label: 'Camión', color: '#90BF49' },
  { icon: MapPin, label: 'GPS', color: '#5ba0d0' },
  { icon: Navigation, label: 'Ruta', color: '#90BF49' },
  { icon: Container, label: 'Contenedor', color: '#5ba0d0' },
  { icon: Building2, label: 'Municipio', color: '#90BF49' },
  { icon: Map, label: 'Mapa', color: '#5ba0d0' },
  { icon: Recycle, label: 'Reciclaje', color: '#90BF49' },
  { icon: BarChart3, label: 'Reportes', color: '#5ba0d0' },
  { icon: Monitor, label: 'Monitoreo', color: '#90BF49' },
];

// ─── Single orbiting icon ────────────────────────────────────────────────────
interface OrbitIconProps {
  icon: React.ElementType;
  label: string;
  color: string;
  /** starting angle in degrees (0 = right, -90 = top) */
  startAngleDeg: number;
  /** orbit radius in px */
  radius: number;
  /** full revolution duration in seconds */
  duration: number;
  /** entrance delay */
  delay?: number;
  /** clockwise or counter-clockwise */
  direction?: 1 | -1;
}

const OrbitIcon: React.FC<OrbitIconProps> = ({
  icon: Icon,
  label,
  color,
  startAngleDeg,
  radius,
  duration,
  delay = 0,
  direction = 1,
}) => {
  // Framer-motion will interpolate from start → start±360
  const endAngle = startAngleDeg + direction * 360;

  return (
    <motion.div
      title={label}
      aria-label={label}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 0,
        height: 0,
        // Orbit wrapper — we rotate this to move the icon around the ring
        originX: 0,
        originY: 0,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, rotate: [startAngleDeg, endAngle] }}
      transition={{
        opacity: { delay, duration: 0.4 },
        rotate: {
          delay,
          duration,
          repeat: Infinity,
          ease: 'linear',
          repeatType: 'loop',
        },
      }}
    >
      {/* The icon sits at the orbit radius, counter-rotated to stay upright */}
      <motion.div
        animate={{ rotate: [-(startAngleDeg), -(endAngle)] }}
        transition={{
          delay,
          duration,
          repeat: Infinity,
          ease: 'linear',
          repeatType: 'loop',
        }}
        style={{
          position: 'absolute',
          left: radius - 22,
          top: -22,
          width: 44,
          height: 44,
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
            filter: 'blur(4px)',
          }}
        />
        {/* Icon pill */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #1e4060, #152C40)',
            border: `1.5px solid ${color}55`,
            boxShadow: `0 4px 14px ${color}28`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Icon size={18} color={color} />
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Orbit ring (decorative dashed circle) ───────────────────────────────────
const OrbitRing: React.FC<{ radius: number; delay?: number }> = ({ radius, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.9, ease: 'easeOut' }}
    style={{
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: radius * 2,
      height: radius * 2,
      marginLeft: -radius,
      marginTop: -radius,
      borderRadius: '50%',
      border: '1px dashed rgba(144,191,73,0.2)',
      pointerEvents: 'none',
    }}
  />
);

// ─── Main component ───────────────────────────────────────────────────────────
interface TechOrbitDisplayProps {
  className?: string;
}

export const TechOrbitDisplay: React.FC<TechOrbitDisplayProps> = ({ className = '' }) => {
  const innerItems = ORBIT_ITEMS.slice(0, 4);
  const outerItems = ORBIT_ITEMS.slice(4);

  const innerRadius = 110;
  const outerRadius = 195;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Orbit rings */}
      <OrbitRing radius={innerRadius} delay={0.15} />
      <OrbitRing radius={outerRadius} delay={0.3} />

      {/* Inner orbit — 4 icons, 22 s clockwise */}
      {innerItems.map((item, i) => (
        <OrbitIcon
          key={`inner-${item.label}`}
          icon={item.icon}
          label={item.label}
          color={item.color}
          startAngleDeg={(360 / innerItems.length) * i - 90}
          radius={innerRadius}
          duration={22}
          delay={0.3 + i * 0.08}
          direction={1}
        />
      ))}

      {/* Outer orbit — 5 icons, 35 s counter-clockwise */}
      {outerItems.map((item, i) => (
        <OrbitIcon
          key={`outer-${item.label}`}
          icon={item.icon}
          label={item.label}
          color={item.color}
          startAngleDeg={(360 / outerItems.length) * i - 90}
          radius={outerRadius}
          duration={35}
          delay={0.5 + i * 0.08}
          direction={-1}
        />
      ))}

      {/* ── Centre card ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: 170,
          height: 170,
          borderRadius: '50%',
          border: '3px solid rgba(144, 191, 73, 0.6)',
          boxShadow: '0 0 0 10px rgba(144, 191, 73, 0.12), 0 12px 45px rgba(0, 0, 0, 0.5), 0 0 35px rgba(144, 191, 73, 0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Pulse glow ring */}
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.45, 0.18, 0.45] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: -14,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(144,191,73,0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Truck Icon Image occupying 100% of the circle */}
        <img
          src={iconoCamion}
          alt="CleanGo Icon"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </motion.div>
    </div>
  );
};
