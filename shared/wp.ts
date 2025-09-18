export interface WpRenderedField {
  rendered?: string;
  protected?: boolean;
}

export interface WpContentField extends WpRenderedField {
  raw?: string;
}

export interface WpBaseItem {
  id: number;
  slug: string;
  status: string;
  date: string;
  modified: string;
  link?: string;
  title: WpRenderedField & { raw?: string };
  excerpt?: WpContentField;
  content?: WpContentField;
}

export type WpPost = WpBaseItem;
export type WpPage = WpBaseItem;

export type UpsertPostPayload = {
  title?: string;
  slug?: string;
  status?: "publish" | "draft" | "private" | "future" | "pending";
  content?: string;
  excerpt?: string;
};
