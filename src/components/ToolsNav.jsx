import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TOOLS, toolPath } from '../lib/tools';

/**
 * Albanian flag — signals that the tool is Albania-specific, so nobody expects
 * it to apply to another country's payroll. Decorative: the adjacent label
 * already names the tool, so it carries an empty alt.
 *
 * Served from /flag-al.svg (public domain, Wikimedia). Rendered identically on
 * every OS, unlike the 🇦🇱 emoji which Windows draws as the letters "AL".
 * Dimensions are set inline so the row never reflows before the file loads.
 */
function FlagAL({ className = '' }) {
  return (
    <img
      src="/flag-al.svg"
      alt=""
      aria-hidden="true"
      width="20"
      height="14"
      className={className}
    />
  );
}

/**
 * Navbar "Tools" entry.
 *
 * Graceful degradation: with exactly one tool this renders as a direct link to
 * that tool (a dropdown holding one item is pure friction). At two or more it
 * becomes an accessible dropdown — keyboard navigable, closes on outside click
 * and Escape. Adding a tool to lib/tools.js flips this automatically.
 */
export default function ToolsNav({ className = '', onNavigate }) {
  const { t, i18n } = useTranslation();
  // Links carry the active language so a shared URL opens in that language.
  const hrefFor = (p) => toolPath(p, i18n.language);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  if (TOOLS.length === 0) return null;

  // Single tool → direct link, no dropdown.
  if (TOOLS.length === 1) {
    return (
      <Link to={hrefFor(TOOLS[0].path)} className={`${className} inline-flex items-center gap-2`} onClick={onNavigate}>
        <FlagAL className="w-5 h-[14px] rounded-[2px] flex-shrink-0 shadow-xs" />
        {t(TOOLS[0].labelKey)}
      </Link>
    );
  }

  function onButtonKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => itemRefs.current[0]?.focus());
    }
  }

  function onItemKeyDown(e, i) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      itemRefs.current[(i + 1) % TOOLS.length]?.focus();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      itemRefs.current[(i - 1 + TOOLS.length) % TOOLS.length]?.focus();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKeyDown}
        className={`${className} inline-flex items-center gap-1`}
      >
        {t('nav.tools.label')}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('nav.tools.label')}
          className="absolute right-0 mt-1 min-w-[220px] py-1 bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline rounded-container shadow-tier2 z-50 animate-scale-in"
        >
          {TOOLS.map((tool, i) => (
            <Link
              key={tool.path}
              to={hrefFor(tool.path)}
              role="menuitem"
              ref={(el) => { itemRefs.current[i] = el; }}
              onKeyDown={(e) => onItemKeyDown(e, i)}
              onClick={() => { setOpen(false); onNavigate?.(); }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-primary dark:text-white hover:bg-surface-subtle dark:hover:bg-surface-dark-elevated transition-colors"
            >
              <FlagAL className="w-5 h-[14px] rounded-[2px] flex-shrink-0 shadow-xs" />
              {t(tool.labelKey)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
