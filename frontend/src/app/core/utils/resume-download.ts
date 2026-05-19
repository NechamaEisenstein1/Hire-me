import { environment } from '../../../environments/environment';

const DEFAULT_RESUME_FILENAME = 'resume.pdf';

export function getResumeDownloadFileName(fileName?: string | null): string {
  const resolved = fileName?.trim();
  return resolved || DEFAULT_RESUME_FILENAME;
}

export function getResumeDownloadHref(fileName?: string | null): string {
  const resolved = getResumeDownloadFileName(fileName);
  const apiBase = environment.apiBaseUrl.replace(/\/$/, '');
  const downloadPath = `/api/v1/resume-profile/file/${encodeURIComponent(resolved)}`;
  return `${apiBase}${downloadPath}`;
}