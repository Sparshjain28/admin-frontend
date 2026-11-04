/**
 * Utility to clean up Surepass DigiboostSdk DOM artifacts and stray buttons.
 * Prevents phantom/ghost "Verify with DigiLocker" buttons from leaking to document.body
 * or duplicating on route changes / fast navigation.
 */
export function cleanupDigilocker(containerSelector?: string) {
  // 1. If a container selector is provided, clear its contents
  if (containerSelector) {
    try {
      const el = document.querySelector(containerSelector);
      if (el) {
        el.innerHTML = '';
      }
    } catch {
      // Ignore invalid selector
    }
  }

  // 2. Remove any stray elements appended directly to document.body outside #root
  try {
    const root = document.getElementById('root');
    const bodyChildren = Array.from(document.body.children);
    for (const child of bodyChildren) {
      if (child !== root && child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE' && child.tagName !== 'NOSCRIPT') {
        const text = (child.textContent || '').toLowerCase();
        const id = (child.id || '').toLowerCase();
        const className = typeof child.className === 'string' ? child.className.toLowerCase() : '';
        if (
          text.includes('digilocker') ||
          text.includes('digiboost') ||
          id.includes('digilocker') ||
          id.includes('digiboost') ||
          className.includes('digilocker') ||
          className.includes('digiboost')
        ) {
          child.remove();
        }
      }
    }

    // 3. Check for any direct child button of body that has DigiLocker text
    document.querySelectorAll('body > button, body > div:not(#root) button').forEach((btn) => {
      const text = (btn.textContent || '').toLowerCase();
      if (text.includes('digilocker') || text.includes('digiboost')) {
        const parent = btn.parentElement;
        if (parent && parent !== root && !root?.contains(parent)) {
          parent.remove();
        } else {
          btn.remove();
        }
      }
    });
  } catch {
    // Non-blocking cleanup
  }
}
