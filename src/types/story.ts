export type Story = {
  id: string;
  title: string;
  createdBy?: string;
  createdAt?: unknown;
};

export type Chapter = {
  id: string;
  title: string;
  content: string;
  index?: number;
};
