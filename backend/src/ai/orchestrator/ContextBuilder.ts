// ==========================================
// FILE: backend/src/ai/orchestrator/ContextBuilder.ts
// ==========================================

import { SecurityContext } from '../tools/types';
import { MemoryService } from '../memory/MemoryService';

export interface DialogueMessage {
  role: 'user' | 'model' | 'system' | 'tool';
  content: string;
  name?: string;
}

export class ContextBuilder {
  private memoryService: MemoryService;

  constructor(memoryService: MemoryService) {
    this.memoryService = memoryService;
  }

  /**
   * Constructs system instructions and historical dialogue context.
   */
  async buildContext(
    userQuery: string,
    history: DialogueMessage[],
    securityContext: SecurityContext,
    availableToolsSummary: string
  ): Promise<{ systemInstruction: string; formattedHistory: DialogueMessage[] }> {
    let memoriesFormatted = '';
    if (securityContext.userId) {
      const memories = await this.memoryService.getRelevantMemories(securityContext.userId, 8);
      if (memories.length > 0) {
        memoriesFormatted = `\n### USER LONG-TERM PERSISTENT MEMORIES:\n${memories.join('\n')}\n`;
      }
    }

    const systemInstruction = `
You are TRADARA AI—the core intelligence powering TRADARA, a global AI-driven B2B and retail marketplace platform.

### CORE OPERATING RULES:
1. **Goal Alignment:** Understand buyer and seller intent in e-commerce, negotiations, and inventory management.
2. **Memory Utilization:** Refer naturally to saved user memories without citing internal system structures.
3. **Tool Precision:** Use available tool definitions to query products, convert currencies, or initiate negotiations.
4. **Negotiation Safety:** Protect seller floor prices. Never exceed authorized discount boundaries without verification.
5. **Transparency:** Distinguish clearly between verified product data and general estimates.

### CURRENT USER SECURITY CONTEXT:
- Role: ${securityContext.role}
- User ID: ${securityContext.userId ?? 'ANONYMOUS'}
- Store ID: ${securityContext.storeId ?? 'NONE'}
- Allowed Permissions: ${securityContext.permissions.join(', ') || 'READ_ONLY'}
${memoriesFormatted}
### AVAILABLE SYSTEM TOOLS:
${availableToolsSummary}
`;

    // Retain the last 12 messages to keep within optimal context limits
    const truncatedHistory = history.slice(-12);

    return {
      systemInstruction,
      formattedHistory: truncatedHistory,
    };
  }
}