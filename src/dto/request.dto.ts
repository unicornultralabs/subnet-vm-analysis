export interface Request {
  codeId: string;
  body: Body;
}

interface Body {
  from: string;
  to: string;
  amount: number;
}
