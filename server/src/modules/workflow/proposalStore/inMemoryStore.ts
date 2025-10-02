import { Proposal, ProposalStore } from "./types";
import crypto from "crypto";

/**
 * @file In-memory implementation of the ProposalStore.
 * This is a simple, non-persistent store for Phase 1.
 * Based on the design in docs/plan/009_phase_1_1_api_design.md
 */

const PROPOSAL_TTL_MS = 30 * 60 * 1000; // 30 minutes

class InMemoryProposalStore implements ProposalStore {
  private proposals: Map<string, Proposal> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.startCleanup();
    console.log("InMemoryProposalStore initialized.");
  }

  async save(proposalData: Omit<Proposal, 'proposalId' | 'createdAt' | 'expiresAt'>): Promise<string> {
    const proposalId = `prop_${crypto.randomBytes(16).toString("hex")}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PROPOSAL_TTL_MS);

    const fullProposal: Proposal = {
      ...proposalData,
      proposalId,
      createdAt: now,
      expiresAt,
    };

    this.proposals.set(proposalId, fullProposal);
    return proposalId;
  }

  async get(proposalId: string): Promise<Proposal | null> {
    const proposal = this.proposals.get(proposalId);

    if (!proposal) {
      return null;
    }

    if (new Date() > proposal.expiresAt) {
      this.proposals.delete(proposalId);
      return null;
    }

    return proposal;
  }

  async delete(proposalId: string): Promise<void> {
    this.proposals.delete(proposalId);
  }

  private cleanupExpired(): void {
    const now = new Date();
    for (const [id, proposal] of this.proposals.entries()) {
      if (now > proposal.expiresAt) {
        this.proposals.delete(id);
      }
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000); // Run cleanup every 5 minutes
  }

  // Call this method on graceful shutdown if needed
  public stopCleanup(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Export a singleton instance to be used across the application
export const proposalStore = new InMemoryProposalStore();
