// libs/common/src/swagger/decorators/api-paginated-response.decorator.ts
import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
  description?: string
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: description || 'Successfully retrieved paginated results',
      schema: {
        allOf: [
          {
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              meta: {
                type: 'object',
                properties: {
                  total: {
                    type: 'number',
                    description: 'Total number of items',
                  },
                  page: {
                    type: 'number',
                    description: 'Current page number',
                  },
                  limit: {
                    type: 'number',
                    description: 'Number of items per page',
                  },
                  totalPages: {
                    type: 'number',
                    description: 'Total number of pages',
                  },
                  timestamp: {
                    type: 'string',
                    description: 'UTC timestamp',
                    example: '2025-01-19 09:57:18',
                  },
                  user: {
                    type: 'string',
                    description: 'User who made the request',
                    example: 'Malik-Hi-Alkhazendar',
                  },
                },
              },
            },
          },
        ],
      },
    })
  );
};