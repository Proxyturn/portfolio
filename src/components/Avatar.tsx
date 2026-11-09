import { cv } from '../content/cv';

/**
 * Profile photo. Built but not rendered yet (William asked to keep it commented out).
 * To enable: add a metadata-stripped `public/avatar.webp` (EXIF removed) and uncomment the
 * `<Avatar />` line in the active story's hook chapter.
 */
export function Avatar({ size = 160 }: { readonly size?: number }) {
  return (
    <img
      className="avatar"
      src="/avatar.webp"
      alt={cv.identity.name}
      width={size}
      height={size}
      decoding="async"
    />
  );
}
