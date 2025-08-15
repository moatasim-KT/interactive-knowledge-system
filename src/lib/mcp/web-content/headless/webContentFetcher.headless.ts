// PDF extraction via pdfjs-dist (node-friendly)
async function extractPdfText(buffer: Uint8Array): Promise<string> {
  try {
    const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.js');
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = undefined;
    }
    const loadingTask = pdfjsLib.getDocument({
      data: buffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true
    });
    const pdf = await loadingTask.promise;
    let fullText = '';
    const numPages = pdf.numPages || 0;
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = (content.items || [])
        .map((it: any) => (typeof it.str === 'string' ? it.str : ''))
        .filter(Boolean);
      const pageText = strings.join(' ').replace(/\s+/g, ' ').trim();
      if (pageText) {fullText += (fullText ? '\n\n' : '') + pageText;}
    }
    return fullText;
  } catch {
    return '';
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const webContentFetcherHeadless = {
  async fetch(url: string, _options: any = {}) {
    // Best-effort fetch without DOMParser; handle HTML, JSON, and PDFs
    try {
      const res = await fetch(url);
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      const now = new Date().toISOString();
      const finalUrl = res.url || url;

      let title = 'Untitled';
      let html = '';
      let text = '';

      if (contentType.includes('application/pdf')) {
        const buffer = new Uint8Array(await res.arrayBuffer());
        text = await extractPdfText(buffer);
        title = (text.split('\n').find((l) => l.trim().length > 0) || 'PDF Document').slice(0, 200);
      } else if (contentType.includes('application/json')) {
        const json = await res.json();
        text = JSON.stringify(json, null, 2);
        html = `<pre>${text}</pre>`;
        title = 'JSON Data';
      } else {
        const raw = await res.text();
        html = raw;
        const titleMatch = raw.match(/<title[^>]*>(.*?)<\/title>/i);
        title = (titleMatch?.[1] || 'Untitled').slice(0, 200);
        text = raw
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gim, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gim, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      // Build basic blocks from paragraphs (for MCP consumers)
      const blocks = (text ? text.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 0) : [])
        .slice(0, 200)
        .map((p, idx) => ({
          id: `text_${idx}`,
          type: 'text',
          content: { html: `<p>${escapeHtml(p)}</p>` },
          metadata: { created: new Date(), modified: new Date(), version: 1 }
        }));

      return {
        id: `content_${Date.now()}`,
        url,
        finalUrl,
        title,
        content: {
          html,
          text,
          images: [],
          codeBlocks: [],
          tables: [],
          charts: [],
          blocks
        },
        metadata: {
          domain: (() => { try { return new URL(finalUrl).hostname; } catch { return 'unknown'; } })(),
          contentType: contentType || 'text/html',
          language: 'en',
          readingTime: Math.ceil((text.split(/\s+/).filter(Boolean).length || 0) / 200),
          wordCount: text.split(/\s+/).filter(Boolean).length || 0,
          keywords: [],
          description: text.substring(0, 200),
          attribution: url,
          tags: [],
          category: contentType.includes('pdf') ? 'document' : 'webpage'
        },
        extraction: {
          method: 'headless',
          confidence: contentType.includes('pdf') ? 0.6 : 0.4,
          qualityScore: text ? 0.6 : 0.3,
          issues: [],
          processingTime: 0
        },
        fetchedAt: now,
        success: true
      };
    } catch (e) {
      return {
        id: `content_${Date.now()}`,
        url,
        title: 'Fetch failed',
        content: { html: '', text: '', images: [], codeBlocks: [], tables: [], charts: [], blocks: [] },
        metadata: {
          domain: 'unknown', contentType: 'error', language: 'en', readingTime: 0, wordCount: 0, keywords: [], description: String(e), attribution: url, tags: ['error'], category: 'error'
        },
        extraction: { method: 'headless', confidence: 0, qualityScore: 0, issues: [String(e)], processingTime: 0 },
        fetchedAt: new Date().toISOString(),
        success: false
      };
    }
  }
};


