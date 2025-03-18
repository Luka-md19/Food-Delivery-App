import { applyDecorators } from "@nestjs/common"
import { ApiQuery } from "@nestjs/swagger"

export const ApiPaginatioQuery = () =>{
    return applyDecorators(
        ApiQuery({
            name: 'page',
            required: false,
            type: Number,
            description: 'Page number(starts from 1)',
            example: 1,
        }),
        ApiQuery({
            name: 'limit',
            required: false,
            type: Number,
            description: 'number of items per page',
            example: 10,
        }),
        ApiQuery({
            name: 'sortBy',
            required: false,
            type: String,
            description: 'Sort by field name', 
            example: 'createdAt',
        }),
        ApiQuery({
            name: 'sortOrder',
            required: false,
            type: String,
            enum: ['ASC', 'DESC'],
            description: 'sort order (ASC or DESC)',
            example: 'DESC',
        }),
    );
};