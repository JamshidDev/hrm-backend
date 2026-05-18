// Javobni Laravel formatiga o'ramaslik uchun (login kabi flat-response endpointlar uchun).

import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE_KEY = 'rawResponse';
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
