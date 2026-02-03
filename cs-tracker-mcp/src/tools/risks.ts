/**
 * Risk-related tools for the MCP server
 */

import { apiClient } from '../api-client.js';

export const riskTools = {
  list_risks: {
    description: 'List risks with optional filters.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'integer',
          description: 'Filter by customer ID',
        },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Filter by severity',
        },
        status: {
          type: 'string',
          enum: ['open', 'mitigating', 'resolved', 'accepted'],
          description: 'Filter by status',
        },
        open_only: {
          type: 'boolean',
          default: true,
          description: 'Only show open/mitigating risks',
        },
        limit: {
          type: 'integer',
          default: 10,
          description: 'Maximum number of results',
        },
      },
    },
    handler: async (args: {
      customer_id?: number;
      severity?: string;
      status?: string;
      open_only?: boolean;
      limit?: number;
    }) => {
      const result = await apiClient.getRisks({
        customer_id: args.customer_id,
        severity: args.severity,
        status: args.status,
        open_only: args.open_only !== false,
      });

      if (result.error) {
        return { error: result.error };
      }

      const risks = (result.data?.items || []).slice(0, args.limit || 10);

      return {
        risks: risks.map((r: any) => ({
          id: r.id,
          title: r.title,
          severity: r.severity,
          status: r.status,
          category: r.category,
          customer: r.customer ? { id: r.customer.id, name: r.customer.name } : null,
          created_at: r.created_at,
        })),
        count: risks.length,
      };
    },
  },

  create_risk: {
    description: 'Create a new risk for a customer.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'integer',
          description: 'Customer ID',
        },
        title: {
          type: 'string',
          description: 'Risk title',
        },
        description: {
          type: 'string',
          description: 'Risk description',
        },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium',
          description: 'Risk severity',
        },
        category: {
          type: 'string',
          enum: ['adoption', 'renewal', 'technical', 'relationship', 'financial', 'other'],
          description: 'Risk category',
        },
        mitigation_plan: {
          type: 'string',
          description: 'Plan to mitigate the risk',
        },
      },
      required: ['customer_id', 'title'],
    },
    handler: async (args: {
      customer_id: number;
      title: string;
      description?: string;
      severity?: string;
      category?: string;
      mitigation_plan?: string;
    }) => {
      const result = await apiClient.createRisk({
        customer_id: args.customer_id,
        title: args.title,
        description: args.description,
        severity: args.severity || 'medium',
        category: args.category,
        mitigation_plan: args.mitigation_plan,
      });

      if (result.error) {
        return { error: result.error };
      }

      return {
        success: true,
        risk_id: result.data?.id,
        message: `Risk '${args.title}' created successfully`,
      };
    },
  },

  get_risk_summary: {
    description: 'Get a summary of all risks including counts by severity and status.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const result = await apiClient.getRiskSummary();

      if (result.error) {
        return { error: result.error };
      }

      return result.data;
    },
  },
};
