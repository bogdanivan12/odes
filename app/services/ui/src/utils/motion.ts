/**
 * Shared motion helpers built on the global `fadeInUp` keyframe (defined in
 * App.tsx). Reduced-motion users are handled globally by the CSS reset there,
 * so these can be used freely.
 */

/** sx fragment that fade-slides a mapped list/grid item in, staggered by index. */
export const staggerSx = (index: number, step = 30, max = 12) => ({
  animation: 'fadeInUp 0.3s ease both',
  animationDelay: `${Math.min(index, max) * step}ms`,
});

/** sx fragment for a clickable card/row: lift + subtle shadow on hover. */
export const hoverLiftSx = {
  transition: 'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
  '&:hover': { transform: 'translateY(-2px)' },
};
