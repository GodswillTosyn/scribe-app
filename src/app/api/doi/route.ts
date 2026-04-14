import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const doi = req.nextUrl.searchParams.get("doi");
  if (!doi) {
    return NextResponse.json({ error: "Missing doi parameter" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { "User-Agent": "Scribe/1.0 (research-tool)" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "DOI not found" }, { status: 404 });
    }

    const data = await res.json();
    const work = data.message;

    // Extract authors
    const authors = (work.author || []).map((a: { given?: string; family?: string }) => {
      if (a.given && a.family) return `${a.family}, ${a.given}`;
      if (a.family) return a.family;
      return a.given || "Unknown";
    });

    // Format authors for APA
    let apaAuthors: string;
    if (authors.length === 0) apaAuthors = "";
    else if (authors.length === 1) apaAuthors = authors[0];
    else if (authors.length === 2) apaAuthors = `${authors[0]} & ${authors[1]}`;
    else apaAuthors = `${authors[0]} et al.`;

    // Extract year
    const dateParts = work["published-print"]?.["date-parts"]?.[0] ||
      work["published-online"]?.["date-parts"]?.[0] ||
      work["created"]?.["date-parts"]?.[0];
    const year = dateParts?.[0]?.toString() || "";

    return NextResponse.json({
      title: work.title?.[0] || "",
      authors: apaAuthors,
      authorsList: authors,
      year,
      journal: work["container-title"]?.[0] || "",
      volume: work.volume || "",
      issue: work.issue || "",
      pages: work.page || "",
      doi,
      url: work.URL || `https://doi.org/${doi}`,
      publisher: work.publisher || "",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch DOI";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
