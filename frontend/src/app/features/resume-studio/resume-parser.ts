import JSZip from 'jszip';

export type ResumeExperience = {
  role: string;
  company: string;
  period: string;
  highlights: string[];
};

export type ResumeProject = {
  name: string;
  summary: string;
  stack: string[];
};

export type ResumeEducation = {
  degree: string;
  school: string;
  period: string;
};

export type ParsedResume = {
  name: string;
  title: string;
  location: string;
  email: string;
  summary: string;
  skills: string[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  education: ResumeEducation[];
};

const SUPPORTED_EXTENSIONS = ['json', 'txt', 'md', 'pdf', 'docx'] as const;
type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

type JsonInput = {
  basics?: {
    name?: string;
    title?: string;
    location?: string;
    email?: string;
    summary?: string;
  };
  skills?: Array<string | { name?: string }>;
  experience?: Array<{
    role?: string;
    company?: string;
    period?: string;
    start?: string;
    end?: string;
    highlights?: string[];
  }>;
  projects?: Array<{
    name?: string;
    summary?: string;
    stack?: string[];
  }>;
  education?: Array<{
    degree?: string;
    school?: string;
    period?: string;
    start?: string;
    end?: string;
  }>;
};

export async function parseResumeFile(file: File): Promise<ParsedResume> {
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

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs';
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjs.getDocument({ data: uint8Array });
  const documentProxy = await loadingTask.promise;
  const pagesText: string[] = [];

  for (let pageIndex = 1; pageIndex <= documentProxy.numPages; pageIndex += 1) {
    const page = await documentProxy.getPage(pageIndex);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText.length > 0) {
      pagesText.push(pageText);
    }
  }

  return pagesText.join('\n');
}

async function extractTextFromDocx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) {
    throw new Error('Invalid DOCX file: word/document.xml is missing.');
  }

  const xml = await documentXmlFile.async('string');
  return xml
    .replace(/<w:p[^>]*>/g, '\n')
    .replace(/<w:tab\/>/g, ' ')
    .replace(/<w:br\/>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function getFileExtension(fileName: string): SupportedExtension | null {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex < 0 || dotIndex === fileName.length - 1) {
    return null;
  }
  return fileName.slice(dotIndex + 1).toLowerCase() as SupportedExtension;
}

function parseJsonResume(content: string): ParsedResume {
  const parsed = JSON.parse(content) as JsonInput;

  const experience = (parsed.experience ?? []).map((item) => ({
    role: item.role ?? 'Role',
    company: item.company ?? 'Company',
    period: item.period ?? formatPeriod(item.start, item.end),
    highlights: item.highlights ?? []
  }));

  const projects = (parsed.projects ?? []).map((item) => ({
    name: item.name ?? 'Project',
    summary: item.summary ?? '',
    stack: item.stack ?? []
  }));

  const education = (parsed.education ?? []).map((item) => ({
    degree: item.degree ?? 'Degree',
    school: item.school ?? 'School',
    period: item.period ?? formatPeriod(item.start, item.end)
  }));

  const skills = (parsed.skills ?? [])
    .map((skill) => (typeof skill === 'string' ? skill : skill.name ?? ''))
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0);

  return {
    name: parsed.basics?.name ?? 'Your Name',
    title: parsed.basics?.title ?? 'Your Title',
    location: parsed.basics?.location ?? 'Location',
    email: parsed.basics?.email ?? 'email@example.com',
    summary: parsed.basics?.summary ?? 'Add a short professional summary.',
    skills,
    experience,
    projects,
    education
  };
}

function parseTextResume(content: string): ParsedResume {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const data: ParsedResume = {
    name: findLabeledValue(lines, ['name']) ?? lines[0] ?? 'Your Name',
    title: findLabeledValue(lines, ['title', 'role']) ?? 'Professional Title',
    location: findLabeledValue(lines, ['location', 'city']) ?? 'Location',
    email: findLabeledValue(lines, ['email']) ?? 'email@example.com',
    summary:
      findSectionBlock(lines, ['summary', 'profile'])?.join(' ') ??
      'Add a short professional summary.',
    skills: splitList(findLabeledValue(lines, ['skills']) ?? ''),
    experience: parseExperienceBlocks(lines),
    projects: parseProjectBlocks(lines),
    education: parseEducationBlocks(lines)
  };

  if (data.skills.length === 0) {
    data.skills = ['Communication', 'Problem Solving', 'Team Leadership'];
  }

  return data;
}

function findLabeledValue(lines: string[], labels: string[]): string | undefined {
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const label of labels) {
      if (lower.startsWith(`${label}:`)) {
        return line.slice(label.length + 1).trim();
      }
    }
  }
  return undefined;
}

function findSectionBlock(lines: string[], labels: string[]): string[] | undefined {
  const sectionStart = lines.findIndex((line) => labels.includes(line.toLowerCase().replace(':', '')));
  if (sectionStart < 0) {
    return undefined;
  }

  const collected: string[] = [];
  for (let i = sectionStart + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.endsWith(':')) {
      break;
    }
    collected.push(line);
  }
  return collected;
}

function parseExperienceBlocks(lines: string[]): ResumeExperience[] {
  const section = findSectionBlock(lines, ['experience', 'work experience']);
  if (!section || section.length === 0) {
    return [];
  }

  return section
    .join(' | ')
    .split('|')
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map((token) => {
      const [roleCompany, period] = token.split('@').map((part) => part.trim());
      const [role, company] = roleCompany.split('-').map((part) => part.trim());
      return {
        role: role ?? 'Role',
        company: company ?? 'Company',
        period: period ?? '',
        highlights: []
      };
    });
}

function parseProjectBlocks(lines: string[]): ResumeProject[] {
  const section = findSectionBlock(lines, ['projects']);
  if (!section || section.length === 0) {
    return [];
  }

  return section
    .map((line) => line.replace(/^[-*]\s*/, ''))
    .map((line) => {
      const [namePart, summaryPart] = line.split(':');
      const summary = (summaryPart ?? '').trim();
      return {
        name: namePart.trim(),
        summary,
        stack: inferStack(summary)
      };
    })
    .filter((item) => item.name.length > 0);
}

function parseEducationBlocks(lines: string[]): ResumeEducation[] {
  const section = findSectionBlock(lines, ['education']);
  if (!section || section.length === 0) {
    return [];
  }

  return section.map((line) => {
    const [degreeSchool, period] = line.split('@').map((part) => part.trim());
    const [degree, school] = degreeSchool.split('-').map((part) => part.trim());
    return {
      degree: degree ?? 'Degree',
      school: school ?? 'School',
      period: period ?? ''
    };
  });
}

function formatPeriod(start?: string, end?: string): string {
  if (!start && !end) {
    return '';
  }
  return `${start ?? '?'} - ${end ?? 'Present'}`;
}

function splitList(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function inferStack(text: string): string[] {
  const known = ['Angular', 'TypeScript', 'Python', 'FastAPI', 'PostgreSQL', 'Docker', 'AWS'];
  const lower = text.toLowerCase();
  return known.filter((tech) => lower.includes(tech.toLowerCase()));
}
