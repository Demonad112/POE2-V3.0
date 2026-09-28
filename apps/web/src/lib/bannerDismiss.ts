/**
 * The patch banner can be closed, and stays closed until the patch changes:
 * the stored value is the patch it was closed on, so bumping CURRENT_PATCH
 * brings it back without anyone clearing storage.
 */

export const BANNER_KEY = "poe2-endgame-companion:banner-dismissed:v1";

/** True when the banner was closed on this patch. */
export function isBannerDismissed(stored: string | null, patch: string): boolean {
  return stored === patch;
}

/**
 * Runs in <head> before paint, like the theme bootstrap, so a closed banner
 * never flashes on load. It only sets an attribute; CSS does the hiding.
 */
export function bannerBootstrap(patch: string): string {
  return `(function(){try{if(localStorage.getItem(${JSON.stringify(BANNER_KEY)})===${JSON.stringify(patch)})document.documentElement.setAttribute('data-banner-dismissed','')}catch(e){}})()`;
}
