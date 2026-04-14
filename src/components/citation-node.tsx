import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";

export interface CitationAttrs {
  id: string;
  text: string;
  filename: string;
  page: number;
  posY: number;
}

/** Format filename into APA-style author/title reference */
function formatApaSource(filename: string, page: number): string {
  // Strip extension
  const name = filename.replace(/\.pdf$/i, "");
  // APA 7th: (Author/Title, Year, p. X) — since we only have filename, use it as title
  // Format: "Title" (p. X)
  return `${name}, p.\u00A0${page}`;
}

function CitationView({ node }: NodeViewProps) {
  const { text, filename, page, id } =
    node.attrs as unknown as CitationAttrs;

  const apaSource = formatApaSource(filename, page);

  return (
    <NodeViewWrapper
      className="citation-node"
      data-citation-id={id}
      contentEditable={false}
      draggable={false}
    >
      <div className="citation-quote">&ldquo;{text}&rdquo;</div>
      <div className="citation-apa">({apaSource})</div>
      <div className="citation-meta">
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span className="citation-id">#{id.slice(0, 8)}</span>
      </div>
    </NodeViewWrapper>
  );
}

export const CitationNode = Node.create({
  name: "citation",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      id: { default: "" },
      text: { default: "" },
      filename: { default: "" },
      page: { default: 1 },
      posY: { default: 0 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="citation"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "citation" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CitationView);
  },
});
