export interface VisibleViewport { height: number; offsetTop: number }
/** Android may resize just the visual viewport, or both viewports. Neither
 * case should pin the drawer to a keyboard-era pixel height. */
export function drawerViewport(layoutHeight: number, visual?: VisibleViewport | null) {
  const height = visual?.height ?? layoutHeight
  return { height, bottom: Math.max(0, layoutHeight - height - (visual?.offsetTop ?? 0)) }
}
