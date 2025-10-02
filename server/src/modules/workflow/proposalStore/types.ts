import { Plan } from "../types";

/**
 * @file Defines the types for the ProposalStore module.
 * Based on the design in docs/plan/009_phase_1_1_api_design.md
 */

export interface Proposal {
  proposalId: string;
  projectId: string;
  userId: string;
  plan: Plan; // The full, executable plan object
  reasoning: string;
  confidence: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface ProposalStore {
  save(proposalData: Omit<Proposal, 'proposalId' | 'createdAt' | 'expiresAt'>): Promise<string>;
  get(proposalId: string): Promise<Proposal | null>;
  delete(proposalId: string): Promise<void>;
}
