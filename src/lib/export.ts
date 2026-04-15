"use client";

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
} from "docx";
import { saveAs } from "file-saver";

/** Strip HTML tags for plain-text fallback */
function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

/** Parse editor HTML into docx paragraphs */
function htmlToParagraphs(html: string): Paragraph[] {
  const div = document.createElement("div");
  div.innerHTML = html;
  const paragraphs: Paragraph[] = [];

  div.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) paragraphs.push(new Paragraph({ children: [new TextRun(text)] }));
      return;
    }

    const el = node as HTMLElement;
    const tag = el.tagName?.toLowerCase();

    if (tag === "h1") {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: el.textContent || "", bold: true })],
        })
      );
    } else if (tag === "h2") {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: el.textContent || "", bold: true })],
        })
      );
    } else if (tag === "h3") {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: el.textContent || "", bold: true })],
        })
      );
    } else if (tag === "blockquote") {
      paragraphs.push(
        new Paragraph({
          indent: { left: 720 },
          children: [
            new TextRun({ text: el.textContent || "", italics: true }),
          ],
        })
      );
    } else if (tag === "div" && el.getAttribute("data-page-break") !== null) {
      // Hard page break
      paragraphs.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    } else if (tag === "div" && el.getAttribute("data-type") === "citation") {
      paragraphs.push(
        new Paragraph({
          indent: { left: 720 },
          spacing: { before: 200, after: 200 },
          children: [
            new TextRun({
              text: el.textContent || "",
              italics: true,
              color: "6D28D9",
            }),
          ],
        })
      );
    } else if (tag === "ul" || tag === "ol") {
      el.querySelectorAll("li").forEach((li) => {
        paragraphs.push(
          new Paragraph({
            bullet: tag === "ul" ? { level: 0 } : undefined,
            children: [new TextRun(li.textContent || "")],
          })
        );
      });
    } else if (tag === "hr") {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "———" })],
        })
      );
    } else {
      // Default: paragraph
      const runs: TextRun[] = [];
      parseInlineNodes(el, runs);
      if (runs.length > 0) {
        paragraphs.push(new Paragraph({ children: runs }));
      }
    }
  });

  return paragraphs.length > 0
    ? paragraphs
    : [new Paragraph({ children: [new TextRun("")] })];
}

function parseInlineNodes(el: HTMLElement, runs: TextRun[]) {
  el.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || "";
      if (text) runs.push(new TextRun(text));
      return;
    }
    const childEl = child as HTMLElement;
    const tag = childEl.tagName?.toLowerCase();
    const text = childEl.textContent || "";

    if (tag === "strong" || tag === "b") {
      runs.push(new TextRun({ text, bold: true }));
    } else if (tag === "em" || tag === "i") {
      runs.push(new TextRun({ text, italics: true }));
    } else if (tag === "u") {
      runs.push(new TextRun({ text, underline: {} }));
    } else if (tag === "s" || tag === "del") {
      runs.push(new TextRun({ text, strike: true }));
    } else if (tag === "code") {
      runs.push(new TextRun({ text, font: "Courier New" }));
    } else {
      runs.push(new TextRun(text));
    }
  });
}

export async function exportToWord(
  html: string,
  projectName: string
): Promise<void> {
  const paragraphs = htmlToParagraphs(html);
  const doc = new Document({
    sections: [{ children: paragraphs }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${projectName}.docx`);
}

export function exportToPdf(html: string, projectName: string): void {
  // Use browser print as a clean PDF export
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${projectName}</title>
      <style>
        body { font-family: "Segoe UI", system-ui, sans-serif; padding: 2rem; max-width: 700px; margin: 0 auto; color: #18181b; line-height: 1.7; font-size: 14px; }
        h1 { font-size: 24px; font-weight: 700; margin: 1.5rem 0 0.75rem; }
        h2 { font-size: 20px; font-weight: 600; margin: 1.25rem 0 0.5rem; }
        h3 { font-size: 16px; font-weight: 600; margin: 1rem 0 0.5rem; }
        blockquote { border-left: 3px solid #6D28D9; padding-left: 1rem; margin: 1rem 0; color: #71717a; background: rgba(109,40,217,0.04); padding: 0.75rem 1rem; border-radius: 0 6px 6px 0; }
        div[data-type="citation"] { border-left: 3px solid #6D28D9; margin-left: 2.5rem; padding: 0.75rem 1rem; background: rgba(109,40,217,0.04); border-radius: 0 6px 6px 0; font-style: italic; margin-bottom: 1rem; }
        code { background: #f0f0f0; padding: 0.15rem 0.4rem; border-radius: 4px; font-family: monospace; }
        pre { background: #fafafa; border: 1px solid #e8e8e8; border-radius: 6px; padding: 1rem; }
        hr { border: none; border-top: 1px solid #e8e8e8; margin: 1.5rem 0; }
        ul, ol { padding-left: 1.5rem; }
        div[data-page-break] { break-after: page; page-break-after: always; height: 0; margin: 0; padding: 0; border: none; }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}
