import { NextRequest, NextResponse } from "next/server";

interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  published: string;
  year: string;
  categories: string[];
  pdfUrl: string;
  arxivUrl: string;
}

function parseArxivXml(xml: string): ArxivPaper[] {
  const papers: ArxivPaper[] = [];
  const entries = xml.split("<entry>").slice(1);

  for (const entry of entries) {
    const get = (tag: string) => {
      const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return match ? match[1].trim() : "";
    };

    const id = get("id").replace("http://arxiv.org/abs/", "").replace(/v\d+$/, "");
    const title = get("title").replace(/\s+/g, " ");
    const summary = get("summary").replace(/\s+/g, " ");
    const published = get("published");
    const year = published ? published.substring(0, 4) : "";

    // Extract authors
    const authorMatches = entry.match(/<author>\s*<name>([^<]+)<\/name>/g) || [];
    const authors = authorMatches.map((a) => {
      const nameMatch = a.match(/<name>([^<]+)<\/name>/);
      return nameMatch ? nameMatch[1] : "";
    }).filter(Boolean);

    // Extract categories
    const catMatches = entry.match(/category term="([^"]+)"/g) || [];
    const categories = catMatches.map((c) => {
      const m = c.match(/term="([^"]+)"/);
      return m ? m[1] : "";
    }).filter(Boolean);

    // PDF link
    const pdfMatch = entry.match(/link[^>]*title="pdf"[^>]*href="([^"]+)"/);
    const pdfUrl = pdfMatch ? pdfMatch[1] : `https://arxiv.org/pdf/${id}`;

    papers.push({
      id,
      title,
      authors,
      summary,
      published,
      year,
      categories,
      pdfUrl,
      arxivUrl: `https://arxiv.org/abs/${id}`,
    });
  }

  return papers;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  const maxResults = req.nextUrl.searchParams.get("max") || "10";

  if (!query) {
    return NextResponse.json({ error: "Missing q parameter" }, { status: 400 });
  }

  try {
    const searchQuery = encodeURIComponent(query);
    const url = `https://export.arxiv.org/api/query?search_query=all:${searchQuery}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;

    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "arXiv search failed" }, { status: 502 });
    }

    const xml = await res.text();
    const papers = parseArxivXml(xml);

    // Extract total results
    const totalMatch = xml.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/);
    const totalResults = totalMatch ? parseInt(totalMatch[1]) : papers.length;

    return NextResponse.json({ papers, totalResults });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to search arXiv";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
