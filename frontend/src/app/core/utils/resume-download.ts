export function getResumeDownloadFileName(fileName?: string | null): string | null {
  return fileName?.trim() || null;
}

export function getResumeDownloadHref(fileName?: string | null): string | null {
  const resolved = getResumeDownloadFileName(fileName);
  return resolved ? `public/${encodeURIComponent(resolved)}` : null;
}