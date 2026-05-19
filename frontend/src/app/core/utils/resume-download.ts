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

/**
 * Fetches the resume file as a Blob and triggers a browser download.
 * Using a blob URL guarantees the `download` attribute is honoured regardless
 * of cross-origin restrictions and bypasses any service-worker cache.
 */
export async function downloadResumeFile(fileName?: string | null): Promise<void> {
  const url = getResumeDownloadHref(fileName);
  const suggestedName = getResumeDownloadFileName(fileName);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Resume download failed: ${response.status}`);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    // Revoke after a short delay so the browser has time to start the download.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
  }
}