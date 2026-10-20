export type Note = {
  id: string;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  /** Emoji shown beside the title; empty when the page has none. */
  icon?: string;
  /** Key of a cover gradient from covers.ts; empty when the page has none. */
  cover?: string;
  starred: boolean;
  updatedAt: number;
  version: number;
  deleted: boolean;
};
export type User = { id: string; name: string; email: string };
