// mobile-ciudadano/components/splash/AnimatedSplashScreen.tsx
/**
 * Splash animado estilo Apple Maps / DiDi: mapa de ciudad con una sola ruta
 * continua en zigzag y curvas suaves, camión CleanGo 3D que sigue el recorrido
 * a velocidad pausada (3.2s), pin de destino y revelación de marca.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';

const cleangoIcon = require('../../assets/images/cleango-icon.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const C = {
  land: '#F5F6F8',
  streetBg: '#ECEEF2',
  streetSecondary: '#DFE2E8',
  streetMain: '#FFFFFF',
  block: '#FDFCFA',
  park: '#E6F4EA',
  parkBorder: '#CEEAD6',
  route: '#1E88E5',
  routeEdge: '#FFFFFF',
  routeGlow: 'rgba(30, 136, 229, 0.22)',
  textBrand: '#1763A6',
  textSubtitle: '#2E7D32',
  textMuted: '#475569',
};

const TRUCK_W = 86;
const TRUCK_H = 54;
const TRUCK_DURATION = 3200;
const PAUSE_DURATION = 400;
const REVEAL_DURATION = 650;
const HOLD_DURATION = 800;
const CORNER_RADIUS = 34;

type Point = { x: number; y: number };

/**
 * Ruta única y continua en zigzag de 4 curvas estilo DiDi / Apple Maps.
 * Inicia en la esquina superior derecha y recorre las avenidas hasta el destino.
 */
const ROUTE_WAYPOINTS: Point[] = [
  { x: 0.82, y: 0.05 }, // Inicio arriba a la derecha
  { x: 0.46, y: 0.20 }, // Curva 1 (gira abajo-derecha)
  { x: 0.74, y: 0.34 }, // Curva 2 (gira abajo-izquierda)
  { x: 0.40, y: 0.50 }, // Curva 3 (gira abajo-derecha)
  { x: 0.76, y: 0.64 }, // Curva 4 (gira hacia el destino)
  { x: 0.76, y: 0.76 }, // Pin de destino final
];

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(p: Point, s: number): Point {
  return { x: p.x * s, y: p.y * s };
}

function len(p: Point): number {
  return Math.hypot(p.x, p.y) || 1;
}

function norm(p: Point): Point {
  const l = len(p);
  return { x: p.x / l, y: p.y / l };
}

function hash01(r: number, c: number): number {
  const n = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function quadBezier(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

type PathSeg =
  | { kind: 'line'; a: Point; b: Point }
  | { kind: 'quad'; a: Point; c: Point; b: Point };

function buildRoundedSegments(pts: Point[], radius: number): PathSeg[] {
  const segs: PathSeg[] = [];
  if (pts.length < 2) return segs;

  let cursor = pts[0];
  for (let i = 1; i < pts.length - 1; i += 1) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];
    const vIn = norm(sub(curr, prev));
    const vOut = norm(sub(next, curr));
    const r = Math.min(radius, len(sub(curr, prev)) / 2.2, len(sub(next, curr)) / 2.2);
    const enter = add(curr, scale(vIn, -r));
    const leave = add(curr, scale(vOut, r));
    segs.push({ kind: 'line', a: cursor, b: enter });
    segs.push({ kind: 'quad', a: enter, c: curr, b: leave });
    cursor = leave;
  }
  segs.push({ kind: 'line', a: cursor, b: pts[pts.length - 1] });
  return segs;
}

function sampleSegments(segs: PathSeg[], samplesPerSeg = 24): { points: Point[]; angles: number[] } {
  const dense: Point[] = [];
  segs.forEach((seg) => {
    const n = seg.kind === 'quad' ? samplesPerSeg : Math.max(12, samplesPerSeg - 6);
    for (let s = 0; s < n; s += 1) {
      const t = s / n;
      if (seg.kind === 'line') {
        dense.push({
          x: seg.a.x + (seg.b.x - seg.a.x) * t,
          y: seg.a.y + (seg.b.y - seg.a.y) * t,
        });
      } else {
        dense.push(quadBezier(seg.a, seg.c, seg.b, t));
      }
    }
  });
  if (segs.length) {
    const last = segs[segs.length - 1];
    dense.push(last.b);
  }

  const angles: number[] = [];
  let prev = 0;
  for (let i = 0; i < dense.length; i += 1) {
    const curr = dense[i];
    const next = dense[Math.min(dense.length - 1, i + 2)];
    let deg = (Math.atan2(next.y - curr.y, next.x - curr.x) * 180) / Math.PI;
    if (i === 0) prev = deg;
    while (deg - prev > 180) deg -= 360;
    while (deg - prev < -180) deg += 360;
    prev = deg;
    angles.push(deg);
  }
  return { points: dense, angles };
}

function segsToPath(segs: PathSeg[]): string {
  if (!segs.length) return '';
  let d = `M ${segs[0].a.x.toFixed(1)} ${segs[0].a.y.toFixed(1)}`;
  segs.forEach((seg) => {
    if (seg.kind === 'line') {
      d += ` L ${seg.b.x.toFixed(1)} ${seg.b.y.toFixed(1)}`;
    } else {
      d += ` Q ${seg.c.x.toFixed(1)} ${seg.c.y.toFixed(1)} ${seg.b.x.toFixed(1)} ${seg.b.y.toFixed(1)}`;
    }
  });
  return d;
}

type CityBlock = { points: string; fill: string };

function generateCity(width: number, height: number): CityBlock[] {
  const cols = 8;
  const rows = 13;
  const grid: Point[][] = [];

  for (let r = 0; r <= rows; r += 1) {
    const row: Point[] = [];
    for (let c = 0; c <= cols; c += 1) {
      row.push({
        x: (c / cols) * width + (hash01(r, c) - 0.5) * width * 0.08,
        y: (r / rows) * height + (hash01(r + 3, c + 7) - 0.5) * height * 0.04,
      });
    }
    grid.push(row);
  }

  const blocks: CityBlock[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (hash01(r * 2, c * 3) < 0.08) continue;

      const wide = hash01(r, c + 19) > 0.75;
      const inset = wide ? 0.24 : 0.16;
      const tl = grid[r][c];
      const tr = grid[r][c + 1];
      const br = grid[r + 1][c + 1];
      const bl = grid[r + 1][c];
      const mid = {
        x: (tl.x + tr.x + br.x + bl.x) / 4,
        y: (tl.y + tr.y + br.y + bl.y) / 4,
      };

      const pull = (p: Point): Point => add(p, scale(sub(mid, p), inset));
      const a = pull(tl);
      const b = pull(tr);
      const d = pull(br);
      const e = pull(bl);
      const isPark = hash01(c + 11, r + 5) > 0.84;
      blocks.push({
        points: `${a.x.toFixed(1)},${a.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)} ${d.x.toFixed(1)},${d.y.toFixed(1)} ${e.x.toFixed(1)},${e.y.toFixed(1)}`,
        fill: isPark ? C.park : C.block,
      });
    }
  }
  return blocks;
}

/**
 * Camión recolector CleanGo 3D con vista superior/elevada y cabina orientada
 * hacia el frente (+X = este), permitiendo rotación perfecta con la tangente de la ruta.
 */
function CleanGoTruck() {
  return (
    <Svg width={TRUCK_W} height={TRUCK_H} viewBox="0 0 160 100">
      <Defs>
        <LinearGradient id="truckShadow" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="rgba(15, 23, 42, 0.28)" />
          <Stop offset="1" stopColor="rgba(15, 23, 42, 0.0)" />
        </LinearGradient>
        <LinearGradient id="dumpGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3CD070" />
          <Stop offset="0.5" stopColor="#2EB85C" />
          <Stop offset="1" stopColor="#1E823E" />
        </LinearGradient>
        <LinearGradient id="cabGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E2E8F0" />
        </LinearGradient>
        <LinearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#0F172A" />
          <Stop offset="0.6" stopColor="#1E293B" />
          <Stop offset="1" stopColor="#38BDF8" />
        </LinearGradient>
      </Defs>

      {/* Sombra de suelo */}
      <Ellipse cx="78" cy="54" rx="54" ry="22" fill="url(#truckShadow)" />

      {/* Ruedas (Eje delantero y doble eje trasero) */}
      <Rect x="110" y="23" width="16" height="7" rx="3.5" fill="#1E293B" />
      <Rect x="110" y="70" width="16" height="7" rx="3.5" fill="#1E293B" />
      <Rect x="42" y="23" width="15" height="7" rx="3.5" fill="#1E293B" />
      <Rect x="42" y="70" width="15" height="7" rx="3.5" fill="#1E293B" />
      <Rect x="61" y="23" width="15" height="7" rx="3.5" fill="#1E293B" />
      <Rect x="61" y="70" width="15" height="7" rx="3.5" fill="#1E293B" />

      {/* Chasis base */}
      <Rect x="30" y="30" width="102" height="40" rx="5" fill="#334155" />

      {/* Tolva / Caja de Recolección (Verde CleanGo) */}
      <Rect x="26" y="27" width="68" height="46" rx="6" fill="url(#dumpGrad)" />
      {/* Detalle relieve y panel trasero */}
      <Rect x="26" y="31" width="6" height="38" rx="2" fill="#166534" opacity={0.6} />
      <Rect x="36" y="29" width="54" height="42" rx="4" fill="#34D399" opacity={0.25} />

      {/* Emblema Circular con Hoja Ecológica CleanGo en el techo */}
      <Circle cx="60" cy="50" r="13" fill="#FFFFFF" />
      <Circle cx="60" cy="50" r="13" stroke="#22C55E" strokeWidth="1.5" fill="none" />
      <Path
        d="M60 41 C67 43 72 50 65 57 C58 54 54 48 57 41 C59 44 61 46 60 41 Z"
        fill="#16A34A"
      />

      {/* Cabina Delantera (Blanca) */}
      <Rect x="94" y="29" width="34" height="42" rx="5" fill="url(#cabGrad)" />
      {/* Parabrisas con tinte oscuro y reflejo celeste */}
      <Path
        d="M116 32 L125 34 C127 35 128 37 128 40 L128 60 C128 63 127 65 125 66 L116 68 Z"
        fill="url(#glassGrad)"
      />
      {/* Ventanillas laterales */}
      <Rect x="100" y="31" width="12" height="4" rx="1.5" fill="#0F172A" />
      <Rect x="100" y="65" width="12" height="4" rx="1.5" fill="#0F172A" />

      {/* Espejos retrovisores */}
      <Rect x="114" y="23" width="4" height="6" rx="2" fill="#64748B" />
      <Rect x="114" y="71" width="4" height="6" rx="2" fill="#64748B" />

      {/* Faros delanteros */}
      <Rect x="127" y="32" width="3" height="6" rx="1.5" fill="#FDE047" />
      <Rect x="127" y="62" width="3" height="6" rx="1.5" fill="#FDE047" />
    </Svg>
  );
}

type Props = {
  onReady: () => void;
  onAnimationEnd: () => void;
};

export function AnimatedSplashScreen({ onReady, onAnimationEnd }: Props) {
  const width = SCREEN_WIDTH || 390;
  const height = SCREEN_HEIGHT || 844;

  const animProgress = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const destOpacity = useRef(new Animated.Value(0)).current;
  const mapOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;

  const absWaypoints = useMemo(
    () => ROUTE_WAYPOINTS.map((p) => ({ x: p.x * width, y: p.y * height })),
    [width, height]
  );
  const segs = useMemo(() => buildRoundedSegments(absWaypoints, CORNER_RADIUS), [absWaypoints]);
  const routePathD = useMemo(() => segsToPath(segs), [segs]);
  const { points, angles } = useMemo(() => sampleSegments(segs), [segs]);
  const destPoint = points[points.length - 1] || { x: width * 0.76, y: height * 0.76 };
  const cityBlocks = useMemo(() => generateCity(width, height), [width, height]);

  const { inputRange, outputRangeX, outputRangeY, outputRangeRot } = useMemo(() => {
    const total = Math.max(points.length - 1, 1);
    const inRange: number[] = [];
    const outX: number[] = [];
    const outY: number[] = [];
    const outRot: string[] = [];
    points.forEach((pt, idx) => {
      inRange.push(idx / total);
      outX.push(pt.x - TRUCK_W / 2);
      outY.push(pt.y - TRUCK_H / 2);
      outRot.push(`${angles[idx].toFixed(1)}deg`);
    });
    return { inputRange: inRange, outputRangeX: outX, outputRangeY: outY, outputRangeRot: outRot };
  }, [points, angles]);

  const truckTranslateX = animProgress.interpolate({ inputRange, outputRange: outputRangeX });
  const truckTranslateY = animProgress.interpolate({ inputRange, outputRange: outputRangeY });
  const truckRotation = animProgress.interpolate({ inputRange, outputRange: outputRangeRot });

  useEffect(() => {
    onReady();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Secuencia principal: Recorrido suave (3.2s) -> Pausa -> Revelación Logo -> Salida
    Animated.sequence([
      Animated.timing(animProgress, {
        toValue: 1,
        duration: TRUCK_DURATION,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(PAUSE_DURATION),
      Animated.parallel([
        Animated.timing(mapOpacity, {
          toValue: 0,
          duration: REVEAL_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: REVEAL_DURATION,
          easing: Easing.out(Easing.back(1.15)),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: REVEAL_DURATION,
          easing: Easing.out(Easing.back(1.15)),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(HOLD_DURATION),
    ]).start(({ finished }) => {
      pulseLoop.stop();
      if (finished) onAnimationEnd();
    });

    const showDest = setTimeout(() => {
      Animated.timing(destOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }, TRUCK_DURATION * 0.7);

    const safetyTimer = setTimeout(() => {
      onAnimationEnd();
    }, TRUCK_DURATION + PAUSE_DURATION + REVEAL_DURATION + HOLD_DURATION + 600);

    return () => {
      pulseLoop.stop();
      clearTimeout(showDest);
      clearTimeout(safetyTimer);
    };
  }, [
    animProgress,
    destOpacity,
    mapOpacity,
    logoOpacity,
    logoScale,
    pulseAnim,
    onReady,
    onAnimationEnd,
  ]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.6, 0.45, 0],
  });

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: mapOpacity }]} pointerEvents="none">
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Fondo de mapa y cuadrícula */}
          <Path d={`M0 0 H${width} V${height} H0 Z`} fill={C.streetBg} />

          {/* Manzanas de la ciudad y parques */}
          {cityBlocks.map((block, idx) => (
            <Polygon key={idx} points={block.points} fill={block.fill} />
          ))}

          {/* Ruta Azul única con curvas y bordes limpios */}
          <Path
            d={routePathD}
            stroke={C.routeGlow}
            strokeWidth={16}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Path
            d={routePathD}
            stroke={C.routeEdge}
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Path
            d={routePathD}
            stroke={C.route}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>

        {/* Pin de Destino (Anillo concéntrico con pulso) */}
        <Animated.View
          style={[
            styles.destWrap,
            {
              left: destPoint.x - 28,
              top: destPoint.y - 28,
              opacity: destOpacity,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.destPulse,
              { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
            ]}
          />
          <View style={styles.destRing} />
          <View style={styles.destCore} />
        </Animated.View>

        {/* Camión CleanGo 3D Animado */}
        <Animated.View
          style={[
            styles.truckContainer,
            {
              transform: [
                { translateX: truckTranslateX },
                { translateY: truckTranslateY },
                { rotate: truckRotation },
              ],
            },
          ]}
        >
          <CleanGoTruck />
        </Animated.View>
      </Animated.View>

      {/* Revelación Final de CleanGo */}
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
        pointerEvents="none"
      >
        <View style={styles.logoBadge}>
          <Image source={cleangoIcon} style={styles.logoImage} resizeMode="contain" />
        </View>
        <Text style={styles.brandTitle}>CleanGo</Text>
        <View style={styles.sloganRow}>
          <View style={styles.sloganDot} />
          <Text style={styles.sloganText}>Juntos por una ciudad más limpia</Text>
          <View style={styles.sloganDot} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.land,
  },
  destWrap: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destPulse: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: C.route,
    backgroundColor: 'rgba(30, 136, 229, 0.15)',
  },
  destRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3.5,
    borderColor: C.route,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1E88E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  destCore: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.route,
  },
  truckContainer: {
    position: 'absolute',
    width: TRUCK_W,
    height: TRUCK_H,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: C.land,
  },
  logoBadge: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#1763A6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImage: {
    width: 116,
    height: 116,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: C.textBrand,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sloganRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  sloganDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.textSubtitle,
  },
  sloganText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textMuted,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
