import HeroPreview from '../Landing/HeroPreview';

/**
 * Auth screen layout (spec 4.5): one centered form tile (max 440px) on the
 * --page background; from 1024px a static product preview built from the
 * same tiles as the landing HeroPreview sits beside it (no data fetch).
 */
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-[85vh] py-8 lg:py-12 grid gap-gap lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] items-center justify-center">
      <div className="relative w-full max-w-[440px] mx-auto">{children}</div>
      <div className="hidden lg:block tile-inner rounded-hero p-[clamp(28px,4vw,48px)]">
        <HeroPreview />
      </div>
    </div>
  );
}
