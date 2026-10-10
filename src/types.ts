export interface PredictionData {
  n: string;
  s: "BIG" | "SMALL";
}

export interface GameIssueResponse {
  code: number;
  msg: string;
  data?: {
    issueNumber?: string;
  };
}
