/**
 * Customer-related tools for the MCP server
 */

import { apiClient } from '../api-client.js';

export const customerTools = {
  search_customers: {
    description: 'Search for customers by name, health status, or CSM. Returns basic customer info.',
    inputSchema: {
      type: 'object',
      properties: {
        search_term: {
          type: 'string',
          description: 'Search term to match against customer name',
        },
        health_status: {
          type: 'string',
          enum: ['red', 'yellow', 'green'],
          description: 'Filter by health status',
        },
        csm_id: {
          type: 'integer',
          description: 'Filter by CSM owner ID',
        },
        limit: {
          type: 'integer',
          default: 10,
          description: 'Maximum number of results',
        },
      },
    },
    handler: async (args: {
      search_term?: string;
      health_status?: string;
      csm_id?: number;
      limit?: number;
    }) => {
      const result = await apiClient.getCustomers({
        limit: args.limit || 10,
        health_status: args.health_status,
        csm_owner_id: args.csm_id,
      });

      if (result.error) {
        return { error: result.error };
      }

      let customers = result.data?.items || [];

      // Filter by search term if provided
      if (args.search_term) {
        const searchLower = args.search_term.toLowerCase();
        customers = customers.filter((c: any) =>
          c.name.toLowerCase().includes(searchLower)
        );
      }

      return {
        customers: customers.map((c: any) => ({
          id: c.id,
          name: c.name,
          health_status: c.health_status,
          arr: c.arr,
          renewal_date: c.renewal_date,
          csm_owner_id: c.csm_owner_id,
        })),
        count: customers.length,
      };
    },
  },

  get_customer_details: {
    description: 'Get full details for a specific customer including health, ARR, risks, and recent activity.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'integer',
          description: 'The customer ID to look up',
        },
      },
      required: ['customer_id'],
    },
    handler: async (args: { customer_id: number }) => {
      const result = await apiClient.getCustomer(args.customer_id);

      if (result.error) {
        return { error: result.error };
      }

      const customer = result.data;

      // Get related data
      const [tasksResult, risksResult] = await Promise.all([
        apiClient.getTasks({ customer_id: args.customer_id, status: 'open' }),
        apiClient.getRisks({ customer_id: args.customer_id, open_only: true }),
      ]);

      return {
        id: customer.id,
        name: customer.name,
        health_status: customer.health_status,
        health_score: customer.health_score,
        adoption_stage: customer.adoption_stage,
        arr: customer.arr,
        renewal_date: customer.renewal_date,
        industry: customer.industry,
        products_owned: customer.products_owned,
        last_contact_date: customer.last_contact_date,
        open_tasks: (tasksResult.data?.items || []).slice(0, 5).map((t: any) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          due_date: t.due_date,
        })),
        open_risks: (risksResult.data?.items || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          severity: r.severity,
          status: r.status,
        })),
      };
    },
  },

  get_renewals_upcoming: {
    description: 'Get customers with upcoming renewals within the specified number of days.',
    inputSchema: {
      type: 'object',
      properties: {
        days: {
          type: 'integer',
          default: 90,
          description: 'Number of days to look ahead for renewals',
        },
      },
    },
    handler: async (args: { days?: number }) => {
      const result = await apiClient.getCustomers({ limit: 100 });

      if (result.error) {
        return { error: result.error };
      }

      const days = args.days || 90;
      const today = new Date();
      const endDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

      const customers = (result.data?.items || []).filter((c: any) => {
        if (!c.renewal_date) return false;
        const renewalDate = new Date(c.renewal_date);
        return renewalDate >= today && renewalDate <= endDate;
      });

      customers.sort((a: any, b: any) =>
        new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime()
      );

      return {
        renewals: customers.map((c: any) => ({
          id: c.id,
          name: c.name,
          health_status: c.health_status,
          arr: c.arr,
          renewal_date: c.renewal_date,
        })),
        count: customers.length,
        total_arr: customers.reduce((sum: number, c: any) => sum + (c.arr || 0), 0),
      };
    },
  },
};
