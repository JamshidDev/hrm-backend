// Laravel ZoomCheckMeetingRequest: meet_uuid + meet_id required|string.

import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ZoomCheckMeetingDto {
  @ApiProperty({ example: 'abc123==' })
  @IsString()
  meet_uuid!: string;

  @ApiProperty({ example: '89012345678' })
  @IsString()
  meet_id!: string;
}
