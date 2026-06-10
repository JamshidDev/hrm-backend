// Laravel SignatureController@auth: $request->code (pkcs7 string).

import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SignatureAuthDto {
  @ApiProperty({ description: 'E-IMZO pkcs7 (base64) imzo' })
  @IsString()
  code!: string;
}
