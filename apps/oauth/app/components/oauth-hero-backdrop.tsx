import { GridPattern } from "@/app/components/grid-pattern";

/**
 * Layered hero background aligned with `apps/docs` `HeroPattern` (gradient, grid, light bloom).
 * Uses CSS + prefers-color-scheme (no Tailwind) so theme tracks system appearance.
 */
export function OauthHeroBackdrop() {
  return (
    <div className="oauth-hero" aria-hidden>
      <div className="oauth-hero-ambient" />
      <div className="oauth-hero-slab">
        <div className="oauth-hero-gradient">
          <div className="oauth-hero-grid">
            <GridPattern
              width={72}
              height={56}
              x={-12}
              y={4}
              squares={[
                [4, 3],
                [2, 1],
                [7, 3],
                [10, 6],
              ]}
              className="oauth-hero-grid-svg"
            />
          </div>
        </div>
        <svg viewBox="0 0 1113 440" className="oauth-hero-bloom">
          <path d="M.016 439.5s-9.5-300 434-300S882.516 20 882.516 20V0h230.004v439.5H.016Z" />
        </svg>
      </div>
    </div>
  );
}
