import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  Query, 
  HttpStatus, 
  DefaultValuePipe,
  ParseIntPipe
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiController } from '@app/common/swagger';
import { FailedMessageDto } from '../dto/common/failed-message.dto';
import { AdminService } from '../services/admin.service';

@Controller('api/admin')
@ApiController('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService
  ) {}

  @Get('failed-messages')
  @ApiOperation({ summary: 'Get failed messages' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of failed messages', type: [FailedMessageDto] })
  async getFailedMessages(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('includeProcessed', new DefaultValuePipe(false)) includeProcessed: boolean
  ): Promise<{ count: number, messages: FailedMessageDto[] }> {
    return this.adminService.getFailedMessages(limit, includeProcessed);
  }

  @Post('retry-message/:id')
  @ApiOperation({ summary: 'Retry a specific failed message' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Message retry status' })
  async retryMessage(
    @Param('id') id: string
  ): Promise<{ success: boolean, message: string }> {
    return this.adminService.retryMessage(id);
  }

  @Post('retry-all-messages')
  @ApiOperation({ summary: 'Retry all failed messages' })
  @ApiResponse({ status: HttpStatus.ACCEPTED, description: 'Retry process initiated' })
  async retryAllMessages(): Promise<{ success: boolean, message: string }> {
    return this.adminService.retryAllMessages();
  }
} 