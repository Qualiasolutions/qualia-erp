/**
 * Transition utilities for smooth loading states
 *
 * Provides crossfade effects that prevent jarring flashes when
 * content loads after skeleton states disappear.
 */

/**
 * Fade-in animation classes for content appearing after skeleton
 * Uses Tailwind's built-in animate-fade-in keyframe (300ms duration)
 * Prevents jarring flash by smoothly transitioning opacity
 */
export const fadeInClasses = 'animate-fade-in-up';

/**
 * Staggered fade-in for lists/grids
 * Each child delays slightly for cascading effect
 * Uses fill-mode-both to maintain animation end state
 */
export const staggerChildrenClasses = 'animate-fade-in-up fill-mode-both';

/**
 * Helper to generate stagger delay classes
 * Use with map index: getStaggerDelay(index)
 *
 * @param index - Zero-based index of the item in the list
 * @returns Inline style object with animation delay
 *
 * @example
 * ```tsx
 * items.map((item, index) => (
 *   <Card key={item.id} style={getStaggerDelay(index)}>
 *     ...
 *   </Card>
 * ))
 * ```
 */
export function getStaggerDelay(index: number): React.CSSProperties {
  // Delay in 50ms increments, max 300ms (first 6 items stagger, rest appear together)
  const delay = Math.min(index * 50, 300);
  return { animationDelay: `${delay}ms` };
}
