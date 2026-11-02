/**
 * Схема связей компании: логотип AZ Group в центре, логотипы проектов вокруг,
 * соединённые линиями, по которым бегут импульсы — «нейронная» связка.
 *
 * Узлы — обычные ссылки на сайты проектов, линии рисуются в SVG под ними.
 * Координаты считаются от измеренного размера контейнера, поэтому разметка
 * и линии всегда совпадают, на любой ширине экрана.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useContent } from '../content/useContent';
import { isSafeHref, safeHref, safeImgSrc } from '../content/safe-url';

interface Size {
  w: number;
  h: number;
}

/**
 * Брейкпоинт `md` Tailwind: от него контейнер переключается на широкую пропорцию.
 * Семь широких карточек (148 px) и логотип компании в центре помещаются, когда
 * контейнер не уже ≈650 px, — на 640-м окне он ещё 570, поэтому не `sm`.
 */
const WIDE_QUERY = '(min-width: 768px)';

/**
 * Размеры карточек. На узком экране считаются от ширины контейнера: семь узлов
 * на эллипсе в 320–420 px помещаются, только если нижняя пара (±64° от низа)
 * разведена хотя бы на ширину узла, а это даёт потолок ≈ 0,30 от ширины.
 */
function sizesFor(wide: boolean, containerW: number) {
  if (wide) return { node: { w: 148, h: 96 }, hub: { w: 216, h: 116 } };
  const nodeW = Math.min(88, Math.round(containerW * 0.27));
  const hubW = Math.min(112, Math.round(containerW * 0.34));
  return {
    node: { w: nodeW, h: Math.round(nodeW * 0.64) },
    hub: { w: hubW, h: Math.round(hubW * 0.46) },
  };
}

export default function NeuralHub() {
  const ref = useRef<HTMLDivElement>(null);
  const all = useContent().projects;
  // В схеме — только проекты с собственным сайтом и логотипом.
  const projects = useMemo(() => all.filter(p => p.kind === 'site' && isSafeHref(p.url) && safeImgSrc(p.logo)), [all]);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [wide, setWide] = useState(() => window.matchMedia(WIDE_QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const onChange = () => setWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { node, hub } = sizesFor(wide, size.w);

  const layout = useMemo(() => {
    const cx = size.w / 2;
    const cy = size.h / 2;
    // Радиусы с запасом, чтобы карточки узлов не выходили за контейнер.
    const rx = Math.max(0, cx - node.w / 2 - 8);
    const ry = Math.max(0, cy - node.h / 2 - 8);

    const nodes = projects.map((p, i) => {
      // Первый узел строго сверху, остальные по кругу по часовой стрелке.
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / projects.length;
      return { project: p, x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
    });

    return { cx, cy, nodes };
  }, [projects, size.w, size.h, node.w, node.h]);

  const ready = size.w > 0 && size.h > 0;

  return (
    <div
      ref={ref}
      className="relative mx-auto aspect-[3/4] w-full max-w-[420px] md:aspect-[16/11] md:max-w-[980px]"
    >
      {ready && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${size.w} ${size.h}`}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="hub-glow">
              <stop offset="0%" style={{ stopColor: 'var(--brand)' }} stopOpacity="0.14" />
              <stop offset="100%" style={{ stopColor: 'var(--brand)' }} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Мягкое свечение под центром — притягивает взгляд к логотипу. */}
          <circle cx={layout.cx} cy={layout.cy} r={Math.min(size.w, size.h) * 0.38} fill="url(#hub-glow)" />

          {/* Кольцо между соседними проектами: связь «все со всеми». */}
          {layout.nodes.map((n, i) => {
            const next = layout.nodes[(i + 1) % layout.nodes.length];
            return (
              <line
                key={`ring-${n.project.slug}`}
                x1={n.x}
                y1={n.y}
                x2={next.x}
                y2={next.y}
                style={{ stroke: 'var(--line-strong)' }}
                strokeWidth="1"
                strokeDasharray="4 6"
              />
            );
          })}

          {/* Лучи от центра к каждому проекту + бегущий по ним импульс. */}
          {layout.nodes.map((n, i) => (
            <g key={`spoke-${n.project.slug}`}>
              <path
                id={`spoke-${n.project.slug}`}
                d={`M ${layout.cx} ${layout.cy} L ${n.x} ${n.y}`}
                style={{ stroke: 'var(--muted)', strokeOpacity: 0.45 }}
                strokeWidth="1.5"
                fill="none"
              />
              {/* Импульс стартует скрытым: до первого срабатывания
                  animateMotion точка стоит в начале координат SVG. */}
              {!reduceMotion && (
                <circle r="3.5" style={{ fill: 'var(--brand)' }} opacity="0">
                  <animateMotion
                    dur="2.6s"
                    begin={`${i * 0.42}s`}
                    repeatCount="indefinite"
                    path={`M ${layout.cx} ${layout.cy} L ${n.x} ${n.y}`}
                  />
                  <animate
                    attributeName="opacity"
                    dur="2.6s"
                    begin={`${i * 0.42}s`}
                    repeatCount="indefinite"
                    values="0;1;1;0"
                    keyTimes="0;0.15;0.8;1"
                  />
                </circle>
              )}
            </g>
          ))}
        </svg>
      )}

      {/* Узлы-проекты */}
      {ready &&
        layout.nodes.map(({ project: p, x, y }) => (
          <a
            key={p.slug}
            href={safeHref(p.url)}
            target="_blank"
            rel="noreferrer"
            title={p.domain ? `${p.name} — ${p.domain}` : p.name}
            className="group absolute grid place-items-center rounded-2xl border border-line bg-paper px-3 shadow-[0_6px_20px_-10px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-1 hover:border-brand-red/50 hover:shadow-[0_14px_32px_-12px_rgba(205,9,41,0.35)]"
            style={{
              width: node.w,
              height: node.h,
              left: x - node.w / 2,
              top: y - node.h / 2,
            }}
          >
            <img
              src={safeImgSrc(p.logo)}
              alt={p.name}
              loading="lazy"
              className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
              style={{
                maxHeight: `${Math.min(88, 64 * p.logoScale)}%`,
                maxWidth: `${Math.min(92, 88 * p.logoScale)}%`,
              }}
            />
          </a>
        ))}

      {/* Центр — логотип компании */}
      {ready && (
        <div
          className="absolute grid place-items-center rounded-2xl border border-line bg-paper px-5 shadow-[0_14px_40px_-16px_rgba(0,0,0,0.35)]"
          style={{
            width: hub.w,
            height: hub.h,
            left: layout.cx - hub.w / 2,
            top: layout.cy - hub.h / 2,
          }}
        >
          <img
            src="/logos/azgroup.png"
            alt="AZ Group"
            className="w-[82%] object-contain"
            width={1195}
            height={150}
          />
        </div>
      )}
    </div>
  );
}
