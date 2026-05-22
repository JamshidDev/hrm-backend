// News engagement DTO'lari.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt } from 'class-validator';

/**
 * POST /news/:id/reaction — Laravel `ChatNewsReactionRequest`.
 * reaction: 1=Like, -1=Dislike, 0=Neutral/remove.
 */
const REACTIONS = [-1, 0, 1];

export class ReactionDto {
  @ApiProperty({
    example: 1,
    enum: REACTIONS,
    description: '1=Like, -1=Dislike, 0=Neutral',
  })
  @Type(() => Number)
  @IsInt()
  @IsIn(REACTIONS)
  reaction!: number;
}
