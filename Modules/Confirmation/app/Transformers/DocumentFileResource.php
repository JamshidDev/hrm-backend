<?php

namespace Modules\Confirmation\Transformers;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\WorkerApplication\WorkerApplicationMinimalResource;

class DocumentFileResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'file' => Helper::fileUrl($this->file),
            'original_name' => $this->original_name,
            'size' => $this->size,
            'worker_application' => new WorkerApplicationMinimalResource($this->worker_application)
        ];
    }
}
