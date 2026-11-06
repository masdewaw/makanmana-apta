export function isPwaUpdateBlocked(document: Document, mutationCount: number): boolean {
  return mutationCount > 0 || !!document.querySelector('[role="dialog"], [data-pwa-busy="true"]') ||
    !!document.activeElement?.matches('input, textarea, select') ||
    [...document.querySelectorAll<HTMLInputElement>('form input:not([type=hidden]):not([type=checkbox]):not([type=radio])')].some(input => input.value.trim().length > 0)
}
