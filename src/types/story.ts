export type Story = {
  id: string;
  title: string;
  createdBy?: string;
  createdAt?: unknown;
  author?: string;
  authorLink?: string;
  source?: string;
};

export type Chapter = {
  id: string;
  title: string;
  content: string;
  index?: number;
};
