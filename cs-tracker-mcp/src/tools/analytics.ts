/**
 * Analytics and portfolio tools for the MCP server
 */

import { apiClient } from '../api-client.js';

export const analyticsTools = {
  get_portfolio_summary: {
    description: "Get a summary of the portfolio including customer count, health distribution, total ARR, and upcoming renewals.",
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const customersResult = await apiClient.getCustomers({ limit: 500 });

      if (customersResult.error) {
        return { error: customersResult.error };
      }

      const customers = customersResult.data?.items || [];

      // Calculate stats
      const totalCustomers = customers.length;
      const totalArr = customers.reduce((sum: number, c: any) => sum + (c.arr || 0), 0);

      const healthDistribution = {
        green: customers.filter((c: any) => c.health_status === 'green').length,
        yellow: customers.filter((c: any) => c.health_status === 'yellow').length,
        red: customers.filter((c: any) => c.health_status === 'red').length,
      };

      const atRiskArr = customers
        .filter((c: any) => c.health_status === 'red' || c.health_status === 'yellow')
        .reduce((sum: number, c: any) => sum + (c.arr || 0), 0);

      // Upcoming renewals (90 days)
      const today = new Date();
      const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
      const upcomingRenewals = customers.filter((c: any) => {
        if (!c.renewal_date) return false;
        const renewalDate = new Date(c.renewal_date);
        return renewalDate >= today && renewalDate <= ninetyDays;
      });

      return {
        total_customers: totalCustomers,
        total_arr: totalArr,
        health_distribution: healthDistribution,
        at_risk_arr: atRiskArr,
        upcoming_renewals: {
          count: upcomingRenewals.length,
          arr: upcomingRenewals.reduce((sum: number, c: any) => sum + (c.arr || 0), 0),
          customers: upcomingRenewals
            .sort((a: any, b: any) => new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime())
            .slice(0, 5)
            .map((c: any) => ({
              id: c.id,
              name: c.name,
              arr: c.arr,
              renewal_date: c.renewal_date,
            })),
        },
      };
    },
  },

  search_meeting_notes: {
    description: 'Search meeting notes for a customer.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'integer',
          description: 'Customer ID',
        },
        search_term: {
          type: 'string',
          description: 'Search term to match against title or notes',
        },
        limit: {
          type: 'integer',
          default: 10,
          description: 'Maximum number of results',
        },
      },
      required: ['customer_id'],
    },
    handler: async (args: { customer_id: number; search_term?: string; limit?: number }) => {
      const result = await apiClient.getMeetingNotes({
        customer_id: args.customer_id,
      });

      if (result.error) {
        return { error: result.error };
      }

      let notes = result.data?.items || [];

      // Filter by search term if provided
      if (args.search_term) {
        const searchLower = args.search_term.toLowerCase();
        notes = notes.filter(
          (n: any) =>
            n.title.toLowerCase().includes(searchLower) ||
            (n.notes && n.notes.toLowerCase().includes(searchLower))
        );
      }

      notes = notes.slice(0, args.limit || 10);

      return {
        meeting_notes: notes.map((n: any) => ({
          id: n.id,
          title: n.title,
          meeting_date: n.meeting_date,
          attendees: n.attendees,
          notes_preview: n.notes ? n.notes.substring(0, 200) : null,
          action_items: n.action_items,
        })),
        count: notes.length,
      };
    },
  },

  create_meeting_note: {
    description: 'Create a meeting note for a customer.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'integer',
          description: 'Customer ID',
        },
        title: {
          type: 'string',
          description: 'Meeting title',
        },
        meeting_date: {
          type: 'string',
          description: 'Meeting date in YYYY-MM-DD format (defaults to today)',
        },
        attendees: {
          type: 'string',
          description: 'List of attendees',
        },
        notes: {
          type: 'string',
          description: 'Meeting notes content',
        },
        action_items: {
          type: 'string',
          description: 'Action items from the meeting',
        },
        next_steps: {
          type: 'string',
          description: 'Next steps',
        },
      },
      required: ['customer_id', 'title'],
    },
    handler: async (args: {
      customer_id: number;
      title: string;
      meeting_date?: string;
      attendees?: string;
      notes?: string;
      action_items?: string;
      next_steps?: string;
    }) => {
      const result = await apiClient.createMeetingNote({
        customer_id: args.customer_id,
        title: args.title,
        meeting_date: args.meeting_date || new Date().toISOString().split('T')[0],
        attendees: args.attendees,
        notes: args.notes,
        action_items: args.action_items,
        next_steps: args.next_steps,
      });

      if (result.error) {
        return { error: result.error };
      }

      return {
        success: true,
        meeting_note_id: result.data?.id,
        message: `Meeting note '${args.title}' created successfully`,
      };
    },
  },
};
