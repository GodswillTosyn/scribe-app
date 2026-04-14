import Dexie, { type EntityTable } from "dexie";

export interface PdfFile {
  id: string;
  name: string;
  data: string; // base64
  authors: string;
  year: string;
  lastPage: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

export interface VersionSnapshot {
  id: string;
  content: string;
  timestamp: number;
}

export interface Project {
  id: string;
  name: string;
  content: string;
  pdfs: PdfFile[];
  activePdfId: string;
  citations: CitationRecord[];
  chatHistory: ChatMessage[];
  versions: VersionSnapshot[];
  createdAt: number;
  updatedAt: number;
}

export interface CitationRecord {
  id: string;
  text: string;
  filename: string;
  authors: string;
  year: string;
  page: number;
  posY: number;
}

const db = new Dexie("ScribeDB") as Dexie & {
  projects: EntityTable<Project, "id">;
};

db.version(3).stores({
  projects: "id, name, updatedAt",
});

db.version(4).stores({
  projects: "id, name, updatedAt",
});

export { db };
