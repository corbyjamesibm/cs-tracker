/**
 * Task-related tools for the MCP server
 */

import { apiClient } from '../api-client.js';

export const taskTools = {
  list_tasks: {
    description: 'List tasks with optional filters. Returns task title, status, priority, due date, and customer.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'integer',
          description: 'Filter by customer ID',
        },
        status: {
          type: 'string',
          enum: ['open', 'in_progress', 'completed', 'cancelled'],
          description: 'Filter by task status',
        },
        assignee_id: {
          type: 'integer',
          description: 'Filter by assignee ID',
        },
        overdue_only: {
          type: 'boolean',
          description: 'Only show overdue tasks',
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
      status?: string;
      assignee_id?: number;
      overdue_only?: boolean;
      limit?: number;
    }) => {
      const result = await apiClient.getTasks({
        customer_id: args.customer_id,
        status: args.status,
        assignee_id: args.assignee_id,
      });

      if (result.error) {
        return { error: result.error };
      }

      let tasks = result.data?.items || [];

      // Filter overdue tasks if requested
      if (args.overdue_only) {
        const now = new Date();
        tasks = tasks.filter((t: any) => {
          if (!t.due_date) return false;
          return new Date(t.due_date) < now && ['open', 'in_progress'].includes(t.status);
        });
      }

      // Limit results
      tasks = tasks.slice(0, args.limit || 10);

      return {
        tasks: tasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date,
          customer: t.customer ? { id: t.customer.id, name: t.customer.name } : null,
          is_overdue: t.due_date && new Date(t.due_date) < new Date() && ['open', 'in_progress'].includes(t.status),
        })),
        count: tasks.length,
      };
    },
  },

  create_task: {
    description: 'Create a new task. Requires at least a title. Customer ID is optional.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Task title',
        },
        description: {
          type: 'string',
          description: 'Task description',
        },
        customer_id: {
          type: 'integer',
          description: 'Customer ID to associate the task with',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          default: 'medium',
          description: 'Task priority',
        },
        due_date: {
          type: 'string',
          description: 'Due date in YYYY-MM-DD format',
        },
        assignee_id: {
          type: 'integer',
          description: 'User ID to assign the task to',
        },
      },
      required: ['title'],
    },
    handler: async (args: {
      title: string;
      description?: string;
      customer_id?: number;
      priority?: string;
      due_date?: string;
      assignee_id?: number;
    }) => {
      const result = await apiClient.createTask({
        title: args.title,
        description: args.description,
        customer_id: args.customer_id,
        priority: args.priority || 'medium',
        due_date: args.due_date,
        assignee_id: args.assignee_id,
      });

      if (result.error) {
        return { error: result.error };
      }

      return {
        success: true,
        task_id: result.data?.id,
        message: `Task '${args.title}' created successfully`,
      };
    },
  },

  complete_task: {
    description: 'Mark a task as completed.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'integer',
          description: 'ID of the task to complete',
        },
        completion_notes: {
          type: 'string',
          description: 'Optional notes about task completion',
        },
      },
      required: ['task_id'],
    },
    handler: async (args: { task_id: number; completion_notes?: string }) => {
      const result = await apiClient.completeTask(args.task_id, args.completion_notes);

      if (result.error) {
        return { error: result.error };
      }

      return {
        success: true,
        message: `Task ${args.task_id} marked as completed`,
      };
    },
  },
};
