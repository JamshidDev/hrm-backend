<?php

namespace Modules\Confirmation\Transformers;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentViewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'file' => Helper::fileUrl($this->confirmation_file),
            'confirmations' => ConfirmationWorkersResource::collection($this->confirmations),
            'files' => DocumentFileResource::collection($this->files)
        ];
    }
}
