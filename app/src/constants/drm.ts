/**
 * Relative luminance (0–255 scale, standard 0.299R+0.587G+0.114B weighting) below which a
 * scanned screenshot is classified as DRM (PROJECT.md §3.4). This is a prototype guess, not
 * a measured value — it has never been compared on-device against a real DRM black screen vs.
 * dark-mode app UI (KakaoTalk/YouTube dark backgrounds are dim but not near-black). Re-tune
 * after the on-device false-positive check in the W3-1 verification checklist.
 */
export const DRM_LUMINANCE_THRESHOLD = 12;
