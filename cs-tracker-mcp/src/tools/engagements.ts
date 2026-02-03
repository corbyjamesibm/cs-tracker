/**
 * Engagement-related tools for the MCP server
 */

import { apiClient } from '../api-client.js';

export const engagementTools = {
  list_engagements: {
    description: 'List engagements for a customer.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'integer',
          description: 'Filter by customer ID',
        },
        limit: {
          type: 'integer',
          default: 10,
          description: 'Maximum number of results',
        },
      },
      required: ['customer_id'],
    },
    handler: async (args: { customer_id: number; limit?: number }) => {
      const result = await apiClient.getEngagements({
        customer_id: args.customer_id,
      });

      if (result.error) {
        return { error: result.error };
      }

      const engagements = (result.data?.items || []).slice(0, args.limit || 10);

      return {
        engagements: engagements.map((e: any) => ({
          id: e.id,
          type: e.engagement_type,
          title: e.title,
          summary: e.summary,
          date: e.engagement_date,
          created_by: e.created_by?.full_name,
        })),
        count: engagements.length,
      };
    },
  },

  log_engagement: {
    description: 'Log a customer engagement (call, meeting, email, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'integer',
          description: 'Customer ID',
        },
        engagement_type: {
          type: 'string',
          enum: ['call', 'meeting', 'email', 'qbr', 'note', 'escalation', 'status_report', 'other'],
          description: 'Type of engagement',
        },
        title: {
          type: 'string',
          description: 'Engagement title',
        },
        summary: {
          type: 'string',
          description: 'Summary of the engagement',
        },
        engagement_date: {
          type: 'string',
          description: 'Date of engagement in YYYY-MM-DD format (defaults to today)',
        },
      },
      required: ['customer_id', 'engagement_type', 'title'],
    },
    handler: async (args: {
      customer_id: number;
      engagement_type: string;
      title: string;
      summary?: string;
      engagement_date?: string;
    }) => {
      const result = await apiClient.createEngagement({
        customer_id: args.customer_id,
        engagement_type: args.engagement_type,
        title: args.title,
        summary: args.summary,
        engagement_date: args.engagement_date || new Date().toISOString().split('T')[0],
      });

      if (result.error) {
        return { error: result.error };
      }

      return {
        success: true,
        engagement_id: result.data?.id,
        message: `Engagement '${args.title}' logged successfully`,
      };
    },
  },
};
