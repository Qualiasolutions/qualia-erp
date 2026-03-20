/**
 * Configure VAPI Assistant with Tools
 * Run with: npx tsx scripts/configure-vapi-tools.ts
 */

const VAPI_PRIVATE_KEY = 'ac425145-0de6-4bdb-a905-c32ee3b5a9c8';
const ASSISTANT_ID = '67d7928b-e292-4f70-bca6-339f0b9eae50';

// Production webhook URL - update this to your actual Vercel deployment URL
const WEBHOOK_URL = 'https://portal.qualiasolutions.net/api/vapi/webhook';

// Define all tools based on the webhook handlers
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_projects',
      description:
        'Get a list of projects. Can filter by status (Active, Demos, Launched, Delayed, Archived, Canceled). Returns project names, types, deadlines, and status summary.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by project status',
            enum: ['all', 'Active', 'Demos', 'Launched', 'Delayed', 'Archived', 'Canceled'],
          },
        },
        required: [],
      },
    },
    server: {
      url: WEBHOOK_URL,
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_issues',
      description:
        'Get a list of tasks/issues. Can filter by status and priority. Returns task titles, statuses, priorities, and assignees.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by task status',
            enum: ['all', 'Todo', 'In Progress', 'Done', 'Canceled'],
          },
          priority: {
            type: 'string',
            description: 'Filter by priority',
            enum: ['all', 'Urgent', 'High', 'Medium', 'Low', 'No Priority'],
          },
        },
        required: [],
      },
    },
    server: {
      url: WEBHOOK_URL,
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_issue',
      description:
        'Create a new task or issue. Specify title, optional description, priority, and project ID.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Title of the task',
          },
          description: {
            type: 'string',
            description: 'Optional description of the task',
          },
          priority: {
            type: 'string',
            description: 'Priority level',
            enum: ['Urgent', 'High', 'Medium', 'Low'],
          },
          projectId: {
            type: 'string',
            description: 'ID of the project to add this task to',
          },
        },
        required: ['title'],
      },
    },
    server: {
      url: WEBHOOK_URL,
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_team_members',
      description:
        'Get a list of team members in the workspace with their names, roles, and contact info.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    server: {
      url: WEBHOOK_URL,
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_schedule',
      description:
        'Get the meeting schedule. Can filter by date (today, tomorrow, this week). Shows meeting titles, times, and attendees.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date filter for meetings',
            enum: ['today', 'tomorrow', 'this week'],
          },
        },
        required: [],
      },
    },
    server: {
      url: WEBHOOK_URL,
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description:
        "Search the knowledge base for information about Qualia Solutions - company info, services, pricing, team, process, contact details, etc. Use this when users ask questions about the company or don't know specific project/task info.",
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query - what information to find',
          },
        },
        required: ['query'],
      },
    },
    server: {
      url: WEBHOOK_URL,
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_client_info',
      description:
        'Get information about clients/leads. Can search by name or filter by lead status (hot, cold, active_client, inactive_client, dropped).',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Client name to search for',
          },
          status: {
            type: 'string',
            description: 'Filter by lead status',
            enum: ['hot', 'cold', 'active_client', 'inactive_client', 'dropped'],
          },
        },
        required: [],
      },
    },
    server: {
      url: WEBHOOK_URL,
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description:
        "Search the web for general information not in the knowledge base. Use for external topics, news, or when user asks about something that isn't company-specific.",
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
        },
        required: ['query'],
      },
    },
    server: {
      url: WEBHOOK_URL,
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_issue',
      description:
        'Update an existing task/issue. Can change status, priority, or assignee. Need the issue ID.',
      parameters: {
        type: 'object',
        properties: {
          issueId: {
            type: 'string',
            description: 'The ID of the issue to update',
          },
          status: {
            type: 'string',
            description: 'New status',
            enum: ['Todo', 'In Progress', 'Done', 'Canceled'],
          },
          priority: {
            type: 'string',
            description: 'New priority',
            enum: ['Urgent', 'High', 'Medium', 'Low'],
          },
          assigneeId: {
            type: 'string',
            description: 'ID of the person to assign to',
          },
        },
        required: ['issueId'],
      },
    },
    server: {
      url: WEBHOOK_URL,
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_meeting',
      description:
        "Schedule a new meeting. Specify title, start time (supports 'today 3pm', 'tomorrow 10am'), optional end time, description, client ID, and project ID.",
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Meeting title',
          },
          startTime: {
            type: 'string',
            description: "Start time - can use 'today 3pm', 'tomorrow 10am', or ISO format",
          },
          endTime: {
            type: 'string',
            description: 'Optional end time',
          },
          description: {
            type: 'string',
            description: 'Meeting description or agenda',
          },
          clientId: {
            type: 'string',
            description: 'ID of the client for this meeting',
          },
          projectId: {
            type: 'string',
            description: 'ID of the related project',
          },
        },
        required: ['title', 'startTime'],
      },
    },
    server: {
      url: WEBHOOK_URL,
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_notification',
      description:
        'Send a notification message to a team member or the whole team. Can be a general message, reminder, or urgent notification.',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The notification message to send',
          },
          recipientName: {
            type: 'string',
            description: 'Name of the person to notify (optional, sends to team if not specified)',
          },
          type: {
            type: 'string',
            description: 'Type of notification',
            enum: ['general', 'reminder', 'urgent'],
          },
        },
        required: ['message'],
      },
    },
    server: {
      url: WEBHOOK_URL,
    },
  },
  {
    type: 'function',
    function: {
      name: 'assign_task',
      description: 'Assign a task to a team member. Can use either assignee ID or search by name.',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'ID of the task to assign',
          },
          assigneeName: {
            type: 'string',
            description: 'Name of the person to assign the task to',
          },
          assigneeId: {
            type: 'string',
            description: 'ID of the assignee (alternative to name)',
          },
        },
        required: ['taskId'],
      },
    },
    server: {
      url: WEBHOOK_URL,
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_project',
      description: 'Update a project status. Can search by project name or use project ID.',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'ID of the project',
          },
          projectName: {
            type: 'string',
            description: 'Name of the project (alternative to ID)',
          },
          status: {
            type: 'string',
            description: 'New project status',
            enum: ['Demos', 'Active', 'Launched', 'Delayed', 'Archived', 'Canceled'],
          },
        },
        required: ['status'],
      },
    },
    server: {
      url: WEBHOOK_URL,
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_overdue_items',
      description:
        'Get all overdue tasks and projects. Shows items past their due dates that are not completed.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    server: {
      url: WEBHOOK_URL,
    },
  },
];

async function configureAssistant() {
  console.log('🔧 Configuring VAPI Assistant with tools...\n');
  console.log(`Assistant ID: ${ASSISTANT_ID}`);
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`Total tools: ${tools.length}\n`);

  try {
    // Get current assistant config first
    console.log('📖 Fetching current assistant configuration...');
    const getResponse = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      throw new Error(`Failed to fetch assistant: ${getResponse.status} - ${errorText}`);
    }

    const currentConfig = await getResponse.json();
    console.log('✅ Current config fetched successfully');
    console.log(`   Current name: ${currentConfig.name || 'unnamed'}`);
    console.log(`   Current tools count: ${currentConfig.model?.tools?.length || 0}\n`);

    // Update assistant with tools
    console.log('🚀 Updating assistant with tools...');

    const updatePayload = {
      model: {
        ...currentConfig.model,
        tools: tools,
      },
      serverUrl: WEBHOOK_URL,
    };

    const updateResponse = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update assistant: ${updateResponse.status} - ${errorText}`);
    }

    const updatedConfig = await updateResponse.json();
    console.log('✅ Assistant updated successfully!\n');
    console.log('📝 Tools configured:');
    tools.forEach((tool, i) => {
      console.log(`   ${i + 1}. ${tool.function.name}`);
    });

    console.log('\n✨ VAPI Assistant is now ready with all tools!');
    console.log(`   Server URL: ${updatedConfig.serverUrl || WEBHOOK_URL}`);
    console.log(`   Tools count: ${updatedConfig.model?.tools?.length || tools.length}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

configureAssistant();
