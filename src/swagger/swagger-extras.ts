import type {
  OpenAPIObject,
  PathItemObject,
  PathsObject,
  SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

const bearerSecurity = [{ bearer: [] }];

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const jsonResponse = (schema: SchemaObject | { $ref: string }) => ({
  description: 'OK',
  content: {
    'application/json': {
      schema,
    },
  },
});

const textResponse = (description: string) => ({
  description,
  content: {
    'text/plain': {
      schema: { type: 'string' },
    },
  },
});

const schemas: Record<string, SchemaObject> = {
  ErrorResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      details: { type: 'string', nullable: true },
    },
    required: ['message'],
    example: {
      message: 'Validation error',
      details: 'email: Invalid email',
    },
  },
  OkResponse: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
    },
    required: ['ok'],
  },
  AuthUser: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      role: { type: 'string', enum: ['customer', 'admin'] },
    },
    required: ['id', 'role'],
  },
  RegisterRequest: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
      firstName: { type: 'string', minLength: 2 },
      lastName: { type: 'string', minLength: 2 },
      phone: { type: 'string' },
    },
    required: ['email', 'password', 'firstName', 'lastName'],
  },
  RegisterResponse: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['customer', 'admin'] },
      profile: {
        type: 'object',
        properties: {
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          phone: { type: 'string', nullable: true },
        },
        required: ['first_name', 'last_name'],
      },
    },
    required: ['id', 'email', 'role', 'profile'],
  },
  LoginRequest: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
    },
    required: ['email', 'password'],
  },
  LoginResponse: {
    type: 'object',
    properties: {
      access_token: { type: 'string' },
      token_type: { type: 'string', example: 'Bearer' },
      expires_in: { type: 'number', example: 604800 },
    },
    required: ['access_token', 'token_type', 'expires_in'],
  },
  VerifyEmailRequest: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      token: { type: 'string' },
    },
    required: ['email', 'token'],
  },
  ResendVerificationRequest: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
    },
    required: ['email'],
  },
  ForgotPasswordRequest: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
    },
    required: ['email'],
  },
  ResetPasswordRequest: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      token: { type: 'string' },
      newPassword: { type: 'string', minLength: 8 },
    },
    required: ['email', 'token', 'newPassword'],
  },
  UserProfile: {
    type: 'object',
    nullable: true,
    properties: {
      first_name: { type: 'string', nullable: true },
      last_name: { type: 'string', nullable: true },
      dni: { type: 'string', nullable: true },
      phone: { type: 'string', nullable: true },
      date_of_birth: { type: 'string', format: 'date', nullable: true },
      avatar_url: { type: 'string', format: 'uri', nullable: true },
    },
  },
  Address: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      full_name: { type: 'string' },
      phone: { type: 'string' },
      street_address: { type: 'string' },
      city: { type: 'string' },
      state: { type: 'string' },
      postal_code: { type: 'string' },
      country: { type: 'string' },
      is_default: { type: 'boolean' },
    },
    required: [
      'id',
      'full_name',
      'phone',
      'street_address',
      'city',
      'state',
      'postal_code',
      'country',
      'is_default',
    ],
  },
  AddressCreateRequest: {
    type: 'object',
    properties: {
      full_name: { type: 'string', minLength: 2 },
      phone: { type: 'string' },
      street_address: { type: 'string' },
      city: { type: 'string' },
      state: { type: 'string' },
      postal_code: { type: 'string' },
      country: { type: 'string' },
      is_default: { type: 'boolean' },
    },
    required: [
      'full_name',
      'phone',
      'street_address',
      'city',
      'state',
      'postal_code',
      'country',
    ],
  },
  AddressUpdateRequest: {
    type: 'object',
    properties: {
      full_name: { type: 'string', minLength: 2 },
      phone: { type: 'string' },
      street_address: { type: 'string' },
      city: { type: 'string' },
      state: { type: 'string' },
      postal_code: { type: 'string' },
      country: { type: 'string' },
      is_default: { type: 'boolean' },
    },
  },
  UserPreferences: {
    type: 'object',
    nullable: true,
    properties: {
      newsletter: { type: 'boolean' },
      promotions: { type: 'boolean' },
      order_updates: { type: 'boolean' },
      new_products: { type: 'boolean' },
      preferred_shoe_size: { type: 'string', nullable: true },
      preferred_clothing_size: { type: 'string', nullable: true },
      favorite_sports: {
        type: 'array',
        items: { type: 'string' },
        nullable: true,
      },
    },
  },
  UserResponse: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['customer', 'admin'] },
      email_verified: { type: 'boolean' },
      profile: ref('UserProfile'),
      addresses: {
        type: 'array',
        items: ref('Address'),
      },
      preferences: ref('UserPreferences'),
    },
    required: ['id', 'email', 'role', 'email_verified', 'profile', 'addresses'],
  },
  UpdateMeRequest: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      first_name: { type: 'string', minLength: 2 },
      last_name: { type: 'string', minLength: 2 },
      dni: { type: 'string', nullable: true },
      phone: { type: 'string', nullable: true },
      date_of_birth: { type: 'string', format: 'date', nullable: true },
      avatar_url: { type: 'string', format: 'uri', nullable: true },
    },
  },
  ProductPublic: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      description: { type: 'string' },
      price: { type: 'string' },
      currency: { type: 'string' },
      stock: { type: 'integer' },
      category: { type: 'string' },
      images: {
        type: 'array',
        items: { type: 'string', format: 'uri' },
        nullable: true,
      },
      is_featured: { type: 'boolean' },
      created_at: { type: 'string', format: 'date-time' },
    },
    required: [
      'id',
      'name',
      'description',
      'price',
      'currency',
      'stock',
      'category',
      'is_featured',
      'created_at',
    ],
  },
  ProductAdmin: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      description: { type: 'string' },
      price: { type: 'string' },
      currency: { type: 'string' },
      stock: { type: 'integer' },
      category: { type: 'string' },
      images: {
        type: 'array',
        items: { type: 'string', format: 'uri' },
        nullable: true,
      },
      is_active: { type: 'boolean' },
      is_featured: { type: 'boolean' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
    required: [
      'id',
      'name',
      'description',
      'price',
      'currency',
      'stock',
      'category',
      'is_active',
      'is_featured',
      'created_at',
      'updated_at',
    ],
  },
  ProductCreateRequest: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2 },
      description: { type: 'string', minLength: 10 },
      price: { type: 'string' },
      currency: { type: 'string', minLength: 3, maxLength: 3 },
      stock: { type: 'integer', minimum: 0 },
      category: { type: 'string', minLength: 2 },
      images: { type: 'array', items: { type: 'string', format: 'uri' } },
      is_active: { type: 'boolean' },
      is_featured: { type: 'boolean' },
    },
    required: ['name', 'description', 'price', 'category'],
  },
  ProductUpdateRequest: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2 },
      description: { type: 'string', minLength: 10 },
      price: { type: 'string' },
      currency: { type: 'string', minLength: 3, maxLength: 3 },
      stock: { type: 'integer', minimum: 0 },
      category: { type: 'string', minLength: 2 },
      images: { type: 'array', items: { type: 'string', format: 'uri' } },
      is_active: { type: 'boolean' },
      is_featured: { type: 'boolean' },
    },
  },
  ProductListResponse: {
    type: 'object',
    properties: {
      page: { type: 'integer' },
      limit: { type: 'integer' },
      total: { type: 'integer' },
      data: { type: 'array', items: ref('ProductPublic') },
    },
    required: ['page', 'limit', 'total', 'data'],
  },
  Product: {
    allOf: [ref('ProductPublic')],
  },
  ProductsListResponse: {
    allOf: [ref('ProductListResponse')],
  },
  CartProduct: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      price: { type: 'string' },
      currency: { type: 'string' },
      stock: { type: 'integer' },
      images: { type: 'array', items: { type: 'string', format: 'uri' }, nullable: true },
      category: { type: 'string' },
    },
    required: ['id', 'name', 'price', 'currency', 'stock', 'category'],
  },
  CartItemResponse: {
    type: 'object',
    properties: {
      product: ref('CartProduct'),
      quantity: { type: 'integer' },
      subtotal: { type: 'string' },
    },
    required: ['product', 'quantity', 'subtotal'],
  },
  CartResponse: {
    type: 'object',
    properties: {
      items: { type: 'array', items: ref('CartItemResponse') },
      total: { type: 'string' },
    },
    required: ['items', 'total'],
    example: {
      items: [
        {
          product: {
            id: '0f3d7b3a-1c2e-4f4b-8e9c-3f5d6a7b8c9d',
            name: 'Zapatillas Runner',
            price: '199.99',
            currency: 'ARS',
            stock: 12,
            images: ['https://example.com/img.jpg'],
            category: 'running',
          },
          quantity: 1,
          subtotal: '199.99',
        },
      ],
      total: '199.99',
    },
  },
  CreateOrderRequest: {
    allOf: [ref('OrderCreateRequest')],
  },
  OrderResponse: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      status: { type: 'string' },
      subtotal: { type: 'string' },
      shipping_total: { type: 'string' },
      discount_total: { type: 'string' },
      total: { type: 'string' },
      currency: { type: 'string' },
      notes: { type: 'string', nullable: true },
      created_at: { type: 'string', format: 'date-time' },
      payment: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          provider: { type: 'string' },
          amount: { type: 'string' },
          transaction_id: { type: 'string', nullable: true },
        },
      },
      items: { type: 'array', items: ref('OrderItemResponse') },
    },
    required: ['id', 'status', 'subtotal', 'total', 'currency', 'created_at', 'items'],
  },
  OrdersListResponse: {
    type: 'object',
    properties: {
      page: { type: 'integer' },
      limit: { type: 'integer' },
      total: { type: 'integer' },
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string' },
            subtotal: { type: 'string' },
            total: { type: 'string' },
            currency: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            payment: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                provider: { type: 'string' },
                amount: { type: 'string' },
              },
            },
            itemsCount: { type: 'integer' },
          },
          required: ['id', 'status', 'total', 'currency', 'created_at'],
        },
      },
    },
    required: ['page', 'limit', 'total', 'data'],
  },
  PaymentUpdateRequest: {
    allOf: [ref('PaymentStatusRequest')],
  },
  OrderItemRequest: {
    type: 'object',
    properties: {
      productId: { type: 'string', format: 'uuid' },
      quantity: { type: 'integer', minimum: 1 },
    },
    required: ['productId', 'quantity'],
  },
  OrderCreateRequest: {
    type: 'object',
    properties: {
      items: { type: 'array', items: ref('OrderItemRequest') },
      notes: { type: 'string' },
    },
    required: ['items'],
  },
  OrderItemResponse: {
    type: 'object',
    properties: {
      productId: { type: 'string', format: 'uuid' },
      product_name: { type: 'string' },
      unit_price: { type: 'string' },
      quantity: { type: 'integer' },
      subtotal: { type: 'string' },
    },
    required: [
      'productId',
      'product_name',
      'unit_price',
      'quantity',
      'subtotal',
    ],
  },
  OrderCreateResponse: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      status: { type: 'string' },
      total: { type: 'string' },
      items: { type: 'array', items: ref('OrderItemResponse') },
      payment: {
        type: 'object',
        properties: {
          status: { type: 'string' },
        },
        required: ['status'],
      },
    },
    required: ['id', 'status', 'total', 'items', 'payment'],
  },
  OrderFromCartResponse: {
    type: 'object',
    properties: {
      orderId: { type: 'string', format: 'uuid' },
      status: { type: 'string' },
      total: { type: 'string' },
      items: { type: 'array', items: ref('OrderItemResponse') },
      payment: {
        type: 'object',
        properties: {
          status: { type: 'string' },
        },
        required: ['status'],
      },
    },
    required: ['orderId', 'status', 'total', 'items', 'payment'],
    example: {
      orderId: '2f1a4d7e-9c0d-4b6a-8d9e-5a3e0a1b2c3d',
      status: 'pendiente_pago',
      total: '199.99',
      items: [
        {
          productId: '0f3d7b3a-1c2e-4f4b-8e9c-3f5d6a7b8c9d',
          product_name: 'Zapatillas Runner',
          unit_price: '199.99',
          quantity: 1,
          subtotal: '199.99',
        },
      ],
      payment: { status: 'pendiente' },
    },
  },
  PaymentStatusRequest: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['aprobado', 'rechazado', 'reembolsado'],
      },
    },
    required: ['status'],
  },
  PaymentStatusResponse: {
    type: 'object',
    properties: {
      orderId: { type: 'string', format: 'uuid' },
      orderStatus: { type: 'string' },
      paymentStatus: { type: 'string' },
    },
    required: ['orderId', 'orderStatus', 'paymentStatus'],
  },
};

const extraPaths: PathsObject = {
  '/api': {
    get: {
      tags: ['system'],
      summary: 'Health check',
      responses: {
        '200': textResponse('OK'),
      },
    },
  },
  '/auth/callback': {
    get: {
      tags: ['auth'],
      summary: 'OAuth callback helper',
      parameters: [
        { name: 'token', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'error', in: 'query', required: false, schema: { type: 'string' } },
      ],
      responses: {
        '200': textResponse('Token echo'),
        '400': textResponse('Missing token or OAuth error'),
      },
    },
  },
  '/api/auth/register': {
    post: {
      tags: ['auth'],
      summary: 'Register user',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: ref('RegisterRequest'),
            example: {
              email: 'user@example.com',
              password: 'Password123',
              firstName: 'Juan',
              lastName: 'Perez',
              phone: '+541112345678',
            },
          },
        },
      },
      responses: {
        '201': jsonResponse(ref('RegisterResponse')),
        '400': jsonResponse(ref('ErrorResponse')),
        '409': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/api/auth/login': {
    post: {
      tags: ['auth'],
      summary: 'Login user',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: ref('LoginRequest'),
            example: { email: 'user@example.com', password: 'Password123' },
          },
        },
      },
      responses: {
        '200': jsonResponse(ref('LoginResponse')),
        '400': jsonResponse(ref('ErrorResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/api/auth/google': {
    get: {
      tags: ['auth'],
      summary: 'Start Google OAuth flow',
      responses: {
        '302': {
          description: 'Redirect to Google consent screen',
        },
      },
    },
  },
  '/api/auth/google/callback': {
    get: {
      tags: ['auth'],
      summary: 'Handle Google OAuth callback',
      description: 'Redirects to frontend callback',
      parameters: [
        {
          name: 'code',
          in: 'query',
          required: false,
          schema: { type: 'string' },
        },
        {
          name: 'state',
          in: 'query',
          required: false,
          schema: { type: 'string' },
        },
      ],
      responses: {
        '302': {
          description: 'Redirect to frontend callback',
        },
      },
    },
  },
  '/api/auth/verify-email': {
    post: {
      tags: ['auth'],
      summary: 'Verify email address',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: ref('VerifyEmailRequest'),
          },
        },
      },
      responses: {
        '200': jsonResponse(ref('OkResponse')),
        '400': jsonResponse(ref('ErrorResponse')),
        '503': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/api/auth/resend-verification': {
    post: {
      tags: ['auth'],
      summary: 'Resend email verification',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: ref('ResendVerificationRequest'),
          },
        },
      },
      responses: {
        '200': jsonResponse(ref('OkResponse')),
      },
    },
  },
  '/api/auth/forgot-password': {
    post: {
      tags: ['auth'],
      summary: 'Request password reset email',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: ref('ForgotPasswordRequest'),
          },
        },
      },
      responses: {
        '200': jsonResponse(ref('OkResponse')),
      },
    },
  },
  '/api/auth/reset-password': {
    post: {
      tags: ['auth'],
      summary: 'Reset password with token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: ref('ResetPasswordRequest'),
          },
        },
      },
      responses: {
        '200': jsonResponse(ref('OkResponse')),
        '400': jsonResponse(ref('ErrorResponse')),
        '503': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/api/me': {
    get: {
      tags: ['users'],
      summary: 'Get current auth user from token',
      security: bearerSecurity,
      responses: {
        '200': jsonResponse(ref('AuthUser')),
        '401': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/api/users/me': {
    get: {
      tags: ['users'],
      summary: 'Get current user profile',
      security: bearerSecurity,
      responses: {
        '200': jsonResponse(ref('UserResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
        '404': jsonResponse(ref('ErrorResponse')),
      },
    },
    put: {
      tags: ['users'],
      summary: 'Update current user profile',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: ref('UpdateMeRequest'),
          },
        },
      },
      responses: {
        '200': jsonResponse(ref('UserResponse')),
        '400': jsonResponse(ref('ErrorResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
        '404': jsonResponse(ref('ErrorResponse')),
        '409': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/api/users/me/addresses': {
    get: {
      tags: ['users'],
      summary: 'List addresses for current user',
      security: bearerSecurity,
      responses: {
        '200': jsonResponse({
          type: 'array',
          items: ref('Address'),
        }),
        '401': jsonResponse(ref('ErrorResponse')),
      },
    },
    post: {
      tags: ['users'],
      summary: 'Create address for current user',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: ref('AddressCreateRequest'),
          },
        },
      },
      responses: {
        '201': jsonResponse(ref('Address')),
        '400': jsonResponse(ref('ErrorResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/api/users/me/addresses/{id}': {
    put: {
      tags: ['users'],
      summary: 'Update address for current user',
      security: bearerSecurity,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: ref('AddressUpdateRequest'),
          },
        },
      },
      responses: {
        '200': jsonResponse(ref('Address')),
        '400': jsonResponse(ref('ErrorResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
        '404': jsonResponse(ref('ErrorResponse')),
      },
    },
    delete: {
      tags: ['users'],
      summary: 'Delete address for current user',
      security: bearerSecurity,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        '204': { description: 'Deleted' },
        '400': jsonResponse(ref('ErrorResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
        '404': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/api/users/me/orders': {
    get: {
      tags: ['orders'],
      summary: 'List current user orders',
      security: bearerSecurity,
      parameters: [
        { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
        { name: 'orderStatus', in: 'query', required: false, schema: { type: 'string', enum: ['pendiente_pago','pagado','en_preparacion','enviado','entregado'] } },
        { name: 'paymentStatus', in: 'query', required: false, schema: { type: 'string', enum: ['pendiente','aprobado','rechazado','reembolsado'] } },
        { name: 'from', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } },
        { name: 'to', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } },
        { name: 'sort', in: 'query', required: false, schema: { type: 'string', enum: ['newest','oldest'], default: 'newest' } },
      ],
      responses: {
        '200': jsonResponse(ref('OrdersListResponse')),
        '400': jsonResponse(ref('ErrorResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/api/users/me/orders/{id}': {
    get: {
      tags: ['orders'],
      summary: 'Get current user order by id',
      security: bearerSecurity,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        '200': jsonResponse(ref('OrderResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
        '404': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/api/admin/ping': {
    get: {
      tags: ['admin'],
      summary: 'Admin ping',
      security: bearerSecurity,
      responses: {
        '200': jsonResponse({
          type: 'object',
          properties: { ok: { type: 'boolean' } },
          required: ['ok'],
        }),
        '401': jsonResponse(ref('ErrorResponse')),
        '403': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/api/products': {
    get: {
      tags: ['products'],
      summary: 'List products',
      parameters: [
        { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 50, default: 12 } },
        { name: 'q', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'category', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'minPrice', in: 'query', required: false, schema: { type: 'number', minimum: 0 } },
        { name: 'maxPrice', in: 'query', required: false, schema: { type: 'number', minimum: 0 } },
        { name: 'inStock', in: 'query', required: false, schema: { type: 'boolean' } },
        {
          name: 'sort',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
            enum: ['newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc'],
            default: 'newest',
          },
        },
      ],
      responses: {
        '200': jsonResponse(ref('ProductListResponse')),
        '400': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/api/cart': {
    get: {
      tags: ['cart'],
      summary: 'Get current cart',
      security: bearerSecurity,
      responses: {
        '200': jsonResponse(ref('CartResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
      },
    },
    delete: {
      tags: ['cart'],
      summary: 'Clear cart',
      security: bearerSecurity,
      responses: {
        '200': jsonResponse(ref('OkResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/api/cart/items': {
    post: {
      tags: ['cart'],
      summary: 'Add item to cart',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                productId: { type: 'string', format: 'uuid' },
                quantity: { type: 'integer', minimum: 1 },
              },
              required: ['productId', 'quantity'],
            },
            example: { productId: '0f3d7b3a-1c2e-4f4b-8e9c-3f5d6a7b8c9d', quantity: 2 },
          },
        },
      },
      responses: {
        '201': jsonResponse(ref('OkResponse')),
        '400': jsonResponse(ref('ErrorResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
        '404': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/api/cart/items/{productId}': {
    put: {
      tags: ['cart'],
      summary: 'Update cart item quantity',
      security: bearerSecurity,
      parameters: [
        { name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { quantity: { type: 'integer', minimum: 1 } },
              required: ['quantity'],
            },
            example: { quantity: 3 },
          },
        },
      },
      responses: {
        '200': jsonResponse(ref('OkResponse')),
        '400': jsonResponse(ref('ErrorResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
        '404': jsonResponse(ref('ErrorResponse')),
      },
    },
    delete: {
      tags: ['cart'],
      summary: 'Remove item from cart',
      security: bearerSecurity,
      parameters: [
        { name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        '200': jsonResponse(ref('OkResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
        '404': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/api/admin/products': {
    post: {
      tags: ['admin', 'products'],
      summary: 'Create product',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: ref('ProductCreateRequest'),
          },
        },
      },
      responses: {
        '201': jsonResponse(ref('ProductAdmin')),
        '400': jsonResponse(ref('ErrorResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
        '403': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/api/admin/products/{id}': {
    get: {
      tags: ['admin', 'products'],
      summary: 'Get product by id',
      security: bearerSecurity,
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        '200': jsonResponse(ref('ProductAdmin')),
        '400': jsonResponse(ref('ErrorResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
        '403': jsonResponse(ref('ErrorResponse')),
        '404': jsonResponse(ref('ErrorResponse')),
      },
    },
    put: {
      tags: ['admin', 'products'],
      summary: 'Update product by id',
      security: bearerSecurity,
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: ref('ProductUpdateRequest'),
          },
        },
      },
      responses: {
        '200': jsonResponse(ref('ProductAdmin')),
        '400': jsonResponse(ref('ErrorResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
        '403': jsonResponse(ref('ErrorResponse')),
        '404': jsonResponse(ref('ErrorResponse')),
      },
    },
    delete: {
      tags: ['admin', 'products'],
      summary: 'Delete (deactivate) product',
      security: bearerSecurity,
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        '200': jsonResponse(ref('ProductAdmin')),
        '400': jsonResponse(ref('ErrorResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
        '403': jsonResponse(ref('ErrorResponse')),
        '404': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/orders': {
    post: {
      tags: ['orders'],
      summary: 'Create order',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: ref('OrderCreateRequest'),
          },
        },
      },
      responses: {
        '201': jsonResponse(ref('OrderCreateResponse')),
        '400': jsonResponse(ref('ErrorResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
        '404': jsonResponse(ref('ErrorResponse')),
        '409': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/orders/from-cart': {
    post: {
      tags: ['orders'],
      summary: 'Create order from cart',
      description: 'Creates an order from the authenticated user cart and clears cart items.',
      security: bearerSecurity,
      responses: {
        '201': jsonResponse(ref('OrderFromCartResponse')),
        '400': jsonResponse(ref('ErrorResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
        '409': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
  '/admin/orders/{orderId}/payment': {
    patch: {
      tags: ['admin', 'orders'],
      summary: 'Update payment status',
      security: bearerSecurity,
      parameters: [
        {
          name: 'orderId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: ref('PaymentUpdateRequest'),
          },
        },
      },
      responses: {
        '200': jsonResponse(ref('PaymentStatusResponse')),
        '400': jsonResponse(ref('ErrorResponse')),
        '401': jsonResponse(ref('ErrorResponse')),
        '403': jsonResponse(ref('ErrorResponse')),
        '404': jsonResponse(ref('ErrorResponse')),
        '409': jsonResponse(ref('ErrorResponse')),
        '500': jsonResponse(ref('ErrorResponse')),
      },
    },
  },
};

type HttpMethod = keyof Pick<PathItemObject, 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head' | 'trace'>;

const httpMethods: HttpMethod[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'trace',
];

function mergePaths(base: PathsObject, overrides: PathsObject): PathsObject {
  const merged: PathsObject = { ...base };

  for (const [path, rawOverride] of Object.entries(overrides)) {
    const override = rawOverride as PathItemObject;
    const existing = (merged[path] ?? {}) as PathItemObject;
    const next: PathItemObject = { ...existing, ...override };

    for (const method of httpMethods) {
      if (override?.[method]) {
        next[method] = override[method];
      }
    }

    if (override?.parameters) {
      next.parameters = override.parameters;
    }

    merged[path] = next;
  }

  return merged;
}

export function applySwaggerExtras(document: OpenAPIObject): OpenAPIObject {
  const components = document.components ?? {};
  const existingSchemas = components.schemas ?? {};

  return {
    ...document,
    paths: mergePaths(document.paths ?? {}, extraPaths),
    components: {
      ...components,
      schemas: {
        ...existingSchemas,
        ...schemas,
      },
    },
  };
}



























