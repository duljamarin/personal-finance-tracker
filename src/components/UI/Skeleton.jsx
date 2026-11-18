export default function Skeleton({ className = '', variant = 'text' }) {
  const variants = {
    text: 'h-4 w-full rounded-pill',
    heading: 'h-7 w-3/4 rounded-pill',
    circle: 'h-10 w-10 rounded-full',
    card: 'h-32 w-full rounded-tile',
    chart: 'h-64 w-full rounded-tile',
  };

  return (
    <div
      className={`bg-inner-2 animate-pulse ${variants[variant]} ${className}`}
    />
  );
}

export function SkeletonGroup({ rows = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={i === rows - 1 ? 'w-2/3' : ''} />
      ))}
    </div>
  );
}
