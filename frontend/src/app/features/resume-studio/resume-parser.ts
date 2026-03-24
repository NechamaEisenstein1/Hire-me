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

type ResumeSections = {
  intro: string[];
  summary: string[];
  skills: string[];
  experience: string[];
  projects: string[];
  education: string[];
};

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
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjs.getDocument({ data: uint8Array });
  const documentProxy = await loadingTask.promise;
  const pagesText: string[] = [];

  for (let pageIndex = 1; pageIndex <= documentProxy.numPages; pageIndex += 1) {
    const page = await documentProxy.getPage(pageIndex);
    const textContent = await page.getTextContent();
    const tokens = (textContent.items as Array<{ str?: string; transform?: number[] }>)
      .map((item) => ({
        text: item.str?.trim() ?? '',
        x: item.transform?.[4] ?? 0,
        y: item.transform?.[5] ?? 0
      }))
      .filter((item) => item.text.length > 0)
      .sort((a, b) => (Math.abs(a.y - b.y) < 1 ? a.x - b.x : b.y - a.y));

    const rows: Array<{ y: number; parts: string[] }> = [];
    for (const token of tokens) {
      const row = rows.find((item) => Math.abs(item.y - token.y) <= 2);
      if (row) {
        row.parts.push(token.text);
      } else {
        rows.push({ y: token.y, parts: [token.text] });
      }
    }

    const pageText = rows
      .map((row) => row.parts.join(' ').replace(/\s+/g, ' ').trim())
      .filter((line) => line.length > 0)
      .join('\n');

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
  const lines = normalizeLines(content);
  const sections = splitIntoSections(lines);

  const intro = sections.intro;
  const summaryLines = sections.summary.length > 0 ? sections.summary : intro.slice(2, 6);
  const email = extractEmail(lines) ?? 'email@example.com';

  const data: ParsedResume = {
    name: extractName(intro),
    title: extractTitle(intro),
    location: extractLocation(intro),
    email,
    summary: summaryLines.join(' ').slice(0, 560) || 'Add a short professional summary.',
    skills: extractSkills(sections.skills, lines),
    experience: extractExperience(sections.experience),
    projects: extractProjects(sections.projects),
    education: extractEducation(sections.education)
  };

  if (data.experience.length === 0) {
    data.experience = inferExperienceFromGeneralLines(lines);
  }

  if (data.projects.length === 0) {
    data.projects = inferProjectsFromGeneralLines(lines);
  }

  if (data.education.length === 0) {
    data.education = inferEducationFromGeneralLines(lines);
  }

  if (data.skills.length === 0) {
    data.skills = ['Communication', 'Problem Solving', 'Team Leadership'];
  }

  return data;
}

function normalizeLines(content: string): string[] {
  return content
    .replace(/\r/g, '\n')
    .split('\n')
    .flatMap((line) => line.split(/\s{3,}/))
    .map((line) => line.replace(/[\u2022\u25cf]/g, '-').trim())
    .map((line) => line.replace(/\s+/g, ' '))
    .filter((line) => line.length > 1);
}

function splitIntoSections(lines: string[]): ResumeSections {
  const sections: ResumeSections = {
    intro: [],
    summary: [],
    skills: [],
    experience: [],
    projects: [],
    education: []
  };

  const headingMap: Record<string, keyof typeof sections> = {
    summary: 'summary',
    profile: 'summary',
    'about me': 'summary',
    'work experience': 'experience',
    experience: 'experience',
    employment: 'experience',
    skills: 'skills',
    technologies: 'skills',
    projects: 'projects',
    education: 'education',
    'academic background': 'education',
    'professional summary': 'summary',
    'ניסיון': 'experience',
    'השכלה': 'education',
    'כישורים': 'skills',
    'פרויקטים': 'projects',
    'סיכום': 'summary',
    'פרופיל': 'summary'
  };

  let current: keyof typeof sections = 'intro';
  for (const line of lines) {
    const normalized = line.toLowerCase().replace(/[:|]/g, '').trim();
    const heading = Object.keys(headingMap).find(
      (candidate) => normalized === candidate || normalized.startsWith(`${candidate} `)
    );

    if (heading && normalized.split(' ').length <= 4) {
      current = headingMap[heading];
      continue;
    }

    sections[current].push(line);
  }

  return sections;
}

function extractEmail(lines: string[]): string | undefined {
  const match = lines.join(' ').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0];
}

function extractName(intro: string[]): string {
  const candidate = intro.find((line) => /^[A-Za-z][A-Za-z\s'.-]{2,50}$/.test(line));
  return candidate ?? intro[0] ?? 'Your Name';
}

function extractTitle(intro: string[]): string {
  const titleKeywords = /(engineer|developer|architect|manager|designer|lead|director|analyst|consultant)/i;
  const candidate = intro.find((line) => titleKeywords.test(line));
  return candidate ?? intro[1] ?? 'Professional Title';
}

function extractLocation(intro: string[]): string {
  const locationCandidate = intro.find(
    (line) =>
      !line.includes('@') &&
      /\b(israel|tel aviv|haifa|jerusalem|remote|usa|uk|europe)\b/i.test(line)
  );
  return locationCandidate ?? 'Location';
}

function extractSkills(skillLines: string[], allLines: string[]): string[] {
  const fromSection = skillLines
    .join(',')
    .split(/[;,|/]/)
    .map((item) => item.replace(/^[-*]\s*/, '').trim())
    .filter((item) => item.length > 1 && item.length < 40);

  const known = [
    'Angular',
    'TypeScript',
    'JavaScript',
    'Python',
    'FastAPI',
    'Django',
    'PostgreSQL',
    'MySQL',
    'MongoDB',
    'Docker',
    'Kubernetes',
    'AWS',
    'GCP',
    'Azure',
    'GraphQL',
    'Node.js',
    'React',
    'Redis'
  ];

  const blob = allLines.join(' ').toLowerCase();
  const inferred = known.filter((skill) => blob.includes(skill.toLowerCase()));
  return uniquePreserveOrder([...fromSection, ...inferred]).slice(0, 24);
}

function extractExperience(lines: string[]): ResumeExperience[] {
  if (lines.length === 0) {
    return [];
  }

  const items: ResumeExperience[] = [];
  let current: ResumeExperience | null = null;

  for (const line of lines) {
    if (looksLikeExperienceHeader(line)) {
      if (current) {
        items.push(current);
      }
      current = parseExperienceHeader(line);
      continue;
    }

    if (!current) {
      continue;
    }

    if (looksLikePeriod(line) && !current.period) {
      current.period = line;
      continue;
    }

    if (line.startsWith('-') || line.startsWith('*')) {
      current.highlights.push(line.replace(/^[-*]\s*/, ''));
      continue;
    }

    if (current.highlights.length < 3 && line.length > 12) {
      current.highlights.push(line);
    }
  }

  if (current) {
    items.push(current);
  }

  return items.slice(0, 10);
}

function parseExperienceHeader(line: string): ResumeExperience {
  const clean = line.replace(/^[-*]\s*/, '');
  const atParts = clean.split(/\sat\s/i);
  if (atParts.length === 2) {
    return {
      role: atParts[0].trim(),
      company: atParts[1].trim(),
      period: '',
      highlights: []
    };
  }

  const dashParts = clean.split(' - ');
  if (dashParts.length === 2) {
    return {
      role: dashParts[0].trim(),
      company: dashParts[1].trim(),
      period: '',
      highlights: []
    };
  }

  return {
    role: clean,
    company: 'Company',
    period: '',
    highlights: []
  };
}

function extractProjects(lines: string[]): ResumeProject[] {
  return lines
    .map((line) => line.replace(/^[-*]\s*/, ''))
    .map((line) => {
      const [name, summary] = splitOnce(line, ':');
      const resolvedName = name.length > 2 ? name : line.slice(0, 40);
      const resolvedSummary = summary.length > 0 ? summary : line;
      return {
        name: resolvedName,
        summary: resolvedSummary,
        stack: inferStack(resolvedSummary)
      };
    })
    .filter((project) => project.name.length > 1)
    .slice(0, 8);
}

function extractEducation(lines: string[]): ResumeEducation[] {
  return lines
    .map((line) => line.replace(/^[-*]\s*/, ''))
    .filter((line) => /b\.sc|m\.sc|bachelor|master|degree|university|college|academy/i.test(line))
    .map((line) => {
      const [degree, school] = splitOnce(line, '-');
      return {
        degree: degree || 'Degree',
        school: school || 'School',
        period: extractPeriodFromLine(line)
      };
    })
    .slice(0, 6);
}

function inferExperienceFromGeneralLines(lines: string[]): ResumeExperience[] {
  return lines
    .filter((line) => looksLikeExperienceHeader(line))
    .slice(0, 4)
    .map((line) => parseExperienceHeader(line));
}

function inferProjectsFromGeneralLines(lines: string[]): ResumeProject[] {
  return lines
    .filter((line) => /project|platform|application|system/i.test(line))
    .slice(0, 3)
    .map((line, index) => ({
      name: `Project ${index + 1}`,
      summary: line,
      stack: inferStack(line)
    }));
}

function inferEducationFromGeneralLines(lines: string[]): ResumeEducation[] {
  return lines
    .filter((line) => /university|college|bachelor|master|degree/i.test(line))
    .slice(0, 2)
    .map((line) => {
      const [degree, school] = splitOnce(line, '-');
      return {
        degree: degree || 'Degree',
        school: school || 'School',
        period: extractPeriodFromLine(line)
      };
    });
}

function looksLikeExperienceHeader(line: string): boolean {
  return (
    /\b(lead|senior|junior|engineer|developer|manager|architect|analyst|consultant)\b/i.test(line) &&
    (line.includes(' at ') || line.includes(' - ') || line.length < 90)
  );
}

function looksLikePeriod(line: string): boolean {
  return /(19|20)\d{2}|present|current|עד היום|\bjan\b|\bfeb\b|\bmar\b|\bapr\b|\bmay\b|\bjun\b|\bjul\b|\baug\b|\bsep\b|\boct\b|\bnov\b|\bdec\b/i.test(
    line
  );
}

function extractPeriodFromLine(line: string): string {
  const match = line.match(/((19|20)\d{2}\s*[-–]\s*((19|20)\d{2}|present|current))/i);
  return match?.[1] ?? '';
}

function splitOnce(value: string, delimiter: string): [string, string] {
  const index = value.indexOf(delimiter);
  if (index < 0) {
    return [value.trim(), ''];
  }
  return [value.slice(0, index).trim(), value.slice(index + delimiter.length).trim()];
}

function uniquePreserveOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = item.trim();
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }
  return result;
}

function formatPeriod(start?: string, end?: string): string {
  if (!start && !end) {
    return '';
  }
  return `${start ?? '?'} - ${end ?? 'Present'}`;
}

function inferStack(text: string): string[] {
  const known = ['Angular', 'TypeScript', 'Python', 'FastAPI', 'PostgreSQL', 'Docker', 'AWS'];
  const lower = text.toLowerCase();
  return known.filter((tech) => lower.includes(tech.toLowerCase()));
}
