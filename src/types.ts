export type Note = {
  id: string;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  starred: boolean;
  updatedAt: number;
  version: number;
  deleted: boolean;
};
export type User = { id: string; name: string; email: string };
