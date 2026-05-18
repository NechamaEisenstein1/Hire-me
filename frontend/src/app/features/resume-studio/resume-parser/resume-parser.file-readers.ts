import JSZip from 'jszip';

export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('public/pdf.worker.min.mjs', document.baseURI).toString();

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
        y: item.transform?.[5] ?? 0,
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

export async function extractTextFromDocx(file: File): Promise<string> {
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
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
