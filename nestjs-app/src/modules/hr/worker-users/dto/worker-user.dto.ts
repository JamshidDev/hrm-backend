// WorkerUser DTO. Laravel: HR/WorkerUserController (5 endpoints).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerUserDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  organization_id?: number;
}

export class AttachWorkerRoleDto {
  @ApiProperty() @IsString() @IsNotEmpty() uuid!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('organizations', 'id')
  organization_id!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role_id?: string;
}

export class DetachWorkerRoleDto {
  @ApiProperty() @IsString() @IsNotEmpty() uuid!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('organizations', 'id')
  organization_id!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() role_id?: number;
}

export class UpdatePasswordDto {
  @ApiProperty() @IsString() @IsNotEmpty() uuid!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() password?: string;
}

export class UpdateProfileDto {
  @ApiProperty() @IsString() @IsNotEmpty() uuid!: string;

  @ApiProperty({ type: () => [String] })
  @IsArray()
  @ArrayMinSize(1)
  phones!: string[];

  @ApiProperty({ example: '901234567' })
  @IsString()
  @Length(9, 9)
  user_phone!: string;
}
