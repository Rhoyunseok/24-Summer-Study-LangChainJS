export interface IArticle {
  id: number;
  title: string;
  contents: string | null;
  view_cnt: number;
  ip_address: string;
  created_at: string;
  created_memberid: number;
}
