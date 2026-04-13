/**
 * 📖 SWAGGER / OPENAPI CONFIGURATION
 * ===================================
 * 
 * Auto-generates API documentation from JSDoc annotations on routes.
 * Accessible at /api/docs in development mode.
 * 
 * @module swagger
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Zhiive API',
      version: '1.0.0',
      description: 'API documentation for the Zhiive Hive platform',
      contact: {
        name: '2Thier SRL',
        url: 'https://zhiive.com',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['super_admin', 'admin', 'manager', 'user', 'client'] },
            avatarUrl: { type: 'string', nullable: true },
          },
        },
        Lead: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            company: { type: 'string' },
            status: { type: 'string' },
            source: { type: 'string' },
          },
        },
        WallPost: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            content: { type: 'string' },
            authorId: { type: 'string' },
            mediaUrls: { type: 'array', items: { type: 'string' } },
            likesCount: { type: 'integer' },
            commentsCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            title: { type: 'string' },
            message: { type: 'string' },
            read: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Organization: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            logoUrl: { type: 'string', nullable: true },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', items: {} },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & session' },
      { name: 'Users', description: 'User management' },
      { name: 'Organizations', description: 'Organization (Colony) management' },
      { name: 'Wall', description: 'Social wall posts (Buzz)' },
      { name: 'Messenger', description: 'Private messaging' },
      { name: 'Leads', description: 'Lead management' },
      { name: 'Calendar', description: 'Calendar events' },
      { name: 'Notifications', description: 'Push & in-app notifications' },
      { name: 'Mail', description: 'Email (Postal)' },
      { name: 'Wax', description: 'Geolocated pins' },
      { name: 'Arena', description: 'Tournaments & competitions' },
      { name: 'Search', description: 'Global & fulltext search' },
      { name: 'Storage', description: 'File upload & management' },
      { name: 'Admin', description: 'Administration endpoints' },
      { name: 'Health', description: 'Health check' },
    ],
  },
  // Scan route files for JSDoc @swagger annotations
  apis: [],
};

// Define paths inline since routes don't have JSDoc annotations yet
const manualPaths: Record<string, unknown> = {
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Health check',
      security: [],
      responses: {
        200: { description: 'Server is healthy', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, uptime: { type: 'number' }, memory: { type: 'object' } } } } } },
      },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login with email & password',
      security: [],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } } } } },
      responses: {
        200: { description: 'JWT token + user', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
        401: { description: 'Invalid credentials' },
      },
    },
  },
  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Get current authenticated user',
      responses: {
        200: { description: 'Current user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
        401: { description: 'Not authenticated' },
      },
    },
  },
  '/users': {
    get: {
      tags: ['Users'],
      summary: 'List all users',
      parameters: [
        { name: 'role', in: 'query', schema: { type: 'string' }, description: 'Filter by role' },
      ],
      responses: { 200: { description: 'List of users', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } } },
    },
  },
  '/organizations': {
    get: {
      tags: ['Organizations'],
      summary: 'List organizations',
      responses: { 200: { description: 'List of organizations', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Organization' } } } } } },
    },
  },
  '/wall/feed': {
    get: {
      tags: ['Wall'],
      summary: 'Get wall feed',
      parameters: [
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'mode', in: 'query', schema: { type: 'string', enum: ['personal', 'org'] } },
      ],
      responses: { 200: { description: 'Wall posts feed', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/WallPost' } } } } } },
    },
  },
  '/wall/posts': {
    post: {
      tags: ['Wall'],
      summary: 'Create a wall post (Buzz)',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string' }, mediaUrls: { type: 'array', items: { type: 'string' } }, publishAsOrg: { type: 'boolean' } } } } } },
      responses: { 201: { description: 'Created post', content: { 'application/json': { schema: { $ref: '#/components/schemas/WallPost' } } } } },
    },
  },
  '/leads': {
    get: {
      tags: ['Leads'],
      summary: 'List leads',
      responses: { 200: { description: 'List of leads', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Lead' } } } } } },
    },
  },
  '/notifications': {
    get: {
      tags: ['Notifications'],
      summary: 'Get user notifications',
      parameters: [
        { name: 'includeRead', in: 'query', schema: { type: 'boolean' } },
      ],
      responses: { 200: { description: 'List of notifications', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Notification' } } } } } },
    },
  },
  '/messenger/conversations': {
    get: {
      tags: ['Messenger'],
      summary: 'List conversations',
      responses: { 200: { description: 'List of conversations' } },
    },
  },
  '/messenger/unread': {
    get: {
      tags: ['Messenger'],
      summary: 'Get unread message count',
      responses: { 200: { description: 'Unread count', content: { 'application/json': { schema: { type: 'object', properties: { count: { type: 'integer' } } } } } } },
    },
  },
  '/search/global': {
    get: {
      tags: ['Search'],
      summary: 'Global search across all entities',
      parameters: [
        { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Search results grouped by entity type' } },
    },
  },
  '/search/fulltext': {
    get: {
      tags: ['Search'],
      summary: 'PostgreSQL full-text search',
      parameters: [
        { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: { 200: { description: 'Full-text search results with snippets' } },
    },
  },
  '/postal/emails': {
    get: {
      tags: ['Mail'],
      summary: 'List emails',
      parameters: [
        { name: 'folder', in: 'query', schema: { type: 'string' } },
        { name: 'maxResults', in: 'query', schema: { type: 'integer' } },
        { name: 'page', in: 'query', schema: { type: 'integer' } },
      ],
      responses: { 200: { description: 'List of emails' } },
    },
  },
  '/upload': {
    post: {
      tags: ['Storage'],
      summary: 'Upload a file',
      requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } },
      responses: { 200: { description: 'Upload result with URL', content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' } } } } } } },
    },
  },
  '/wax/pins': {
    get: {
      tags: ['Wax'],
      summary: 'Get map pins in bounding box',
      parameters: [
        { name: 'sw_lat', in: 'query', required: true, schema: { type: 'number' } },
        { name: 'sw_lng', in: 'query', required: true, schema: { type: 'number' } },
        { name: 'ne_lat', in: 'query', required: true, schema: { type: 'number' } },
        { name: 'ne_lng', in: 'query', required: true, schema: { type: 'number' } },
      ],
      responses: { 200: { description: 'List of pins' } },
    },
  },
  '/arena/tournaments': {
    get: {
      tags: ['Arena'],
      summary: 'List tournaments',
      responses: { 200: { description: 'List of tournaments' } },
    },
  },
  '/admin/storage/orphans': {
    get: {
      tags: ['Admin'],
      summary: 'List GCS orphan files (super admin)',
      responses: { 200: { description: 'Orphan file analysis', content: { 'application/json': { schema: { type: 'object', properties: { totalGCSFiles: { type: 'integer' }, referencedFiles: { type: 'integer' }, orphanCount: { type: 'integer' }, orphans: { type: 'array', items: { type: 'string' } } } } } } } },
    },
    delete: {
      tags: ['Admin'],
      summary: 'Delete GCS orphan files (super admin)',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['keys'], properties: { keys: { type: 'array', items: { type: 'string' } } } } } } },
      responses: { 200: { description: 'Deletion results' } },
    },
  },
};

export function generateSwaggerSpec() {
  const spec = swaggerJsdoc(options);
  // Merge manual paths
  spec.paths = { ...spec.paths, ...manualPaths };
  return spec;
}
