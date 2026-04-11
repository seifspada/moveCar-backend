// types/agent.type.ts
export class AgentType {
  id: number;
  email: string;
  photo: string | null;
  isActive: boolean;
  agenceId: number;
  createdAt: Date;
  updatedAt: Date;
  // ❌ password exclu intentionnellement
}
