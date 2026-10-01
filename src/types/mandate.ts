import { Eip712Domain } from "./trade";

export interface AgentMandateDescriptor {
  id: string;
  mandateId: string;
  delegator: string;
  trader?: string;
  agent: string;
  maxSpendUsd?: number;
  maxSpendUsdc: number;
  remainingSpend: number;
  maxSlippageBps: number;
  allowedPairs: string[];
  pairsBitmask?: number;
  deadline: number;
  nonce: number;
  createdAt: number;
  expiresAt?: number;
  signature?: string | null;
  revoked?: boolean;
}

export interface AgentMandateMessage {
  authorizer?: string;
  delegator?: string;
  agent: string;
  maxCumulativeSpend?: string;
  maxSpendPerTx?: string;
  maxSpendUsdc?: string;
  maxSlippageBps: number;
  allowedPairsMask?: string;
  pairsBitmask?: number;
  expiry?: number;
  deadline?: number;
  nonce: number;
}

export interface AgentMandateTicket {
  types: {
    EIP712Domain: Array<{ name: string; type: string }>;
    AgentMandate: Array<{ name: string; type: string }>;
  };
  primaryType: "AgentMandate";
  domain: Eip712Domain;
  message: AgentMandateMessage;
  raw?: any;
  meta?: any;
}
