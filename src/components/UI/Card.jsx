import { delayStyle, tileDelay } from '../../utils/motion';

/**
 * Tile (design-system §3.1). Every card-like surface in the app is a Card.
 *
 * variant:
 *   default  --tile, 1px --line, R_TILE, hover lift on pointer devices
 *   hero     the one green tile per screen (--hero-tile, white text)
 *   inner    --inner panel inside a tile, R_INNER, no border, no lift
 *   (legacy names elevated / interactive / outlined / ghost map to the above)
 * padding: none | sm (dense, 24px) | md / lg (TILE_PAD, 26px); inner uses GAP.
 * index:  reading-order position; when set the tile pops in with tileDelay(index).
 * lift:   set false for tiles that should not lift on hover.
 */
const VARIANT = {
  default: 'tile',
  hero: 'tile tile-hero',
  inner: 'tile-inner',
  elevated: 'tile',
  interactive: 'tile cursor-pointer',
  outlined: 'tile',
  ghost: 'tile-inner',
};

const PAD = {
  none: '',
  sm: 'p-tile-dense',
  md: 'p-tile-dense sm:p-tile',
  lg: 'p-tile-dense sm:p-tile',
};

const INNER_PAD = {
  none: '',
  sm: 'p-gap',
  md: 'p-gap',
  lg: 'p-tile-dense',
};

export default function Card({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  index,
  delay,
  lift = true,
  as: Tag = 'div',
  style,
  ...rest
}) {
  const isInner = variant === 'inner' || variant === 'ghost';
  const pad = (isInner ? INNER_PAD : PAD)[padding] ?? PAD.md;
  const animated = typeof index === 'number' || typeof delay === 'number';
  const ms = typeof delay === 'number' ? delay : tileDelay(index);
  return (
    <Tag
      className={[
        VARIANT[variant] || VARIANT.default,
        !isInner && lift ? 'tile-lift' : '',
        animated ? 'animate-pop' : '',
        pad,
        className,
      ].filter(Boolean).join(' ')}
      style={animated ? { ...delayStyle(ms), ...style } : style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
