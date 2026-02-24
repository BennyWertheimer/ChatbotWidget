export type Role = "system" | "user" | "assistant";

export type ChatMessage = {
  role: Role;
  content: string;
};

export type ChatRequest = {
  messages: ChatMessage[];
};

export type ChatResponse = {
  reply: string;
};
