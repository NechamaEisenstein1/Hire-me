import { extractTextFromDocx, extractTextFromPdf } from './resume-parser/resume-parser.file-readers';
import { parseJsonResume } from './resume-parser/resume-parser.json';
import { parseTextResume } from './resume-parser/resume-parser.text';
import { SUPPORTED_EXTENSIONS, SupportedExtension } from './resume-parser/resume-parser.types';

export type {
  ParsedResume,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
} from './resume-parser/resume-parser.types';

export async function parseResumeFile(file: File) {
  const extension = getFileExtension(file.name);

  if (!extension || !SUPPORTED_EXTENSIONS.includes(extension)) {
    throw new Error('Unsupported file type. Use JSON, TXT, MD, PDF, or DOCX.');
  }

  if (extension === 'json') {
    return parseJsonResume(await file.text());
  }

  if (extension === 'pdf') {
    const extractedText = await extractTextFromPdf(file);
    return parseTextResume(extractedText);
  }

  if (extension === 'docx') {
    const extractedText = await extractTextFromDocx(file);
    return parseTextResume(extractedText);
  }

  return parseTextResume(await file.text());
}

function getFileExtension(fileName: string): SupportedExtension | null {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex < 0 || dotIndex === fileName.length - 1) {
    return null;
  }

  const ext = fileName.slice(dotIndex + 1).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension) ? (ext as SupportedExtension) : null;
}
