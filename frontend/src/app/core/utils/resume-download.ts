const DEFAULT_RESUME_FILENAME = 'resume.pdf';

export function getResumeDownloadFileName(fileName?: string | null): string {
  const resolved = fileName?.trim();
  return resolved || DEFAULT_RESUME_FILENAME;
}

export function getResumeDownloadHref(fileName?: string | null): string {
  const resolved = getResumeDownloadFileName(fileName);
  return `public/${encodeURIComponent(resolved)}`;
}