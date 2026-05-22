<?php

namespace Modules\HR\Transformers\Export;

use App\Enums\ExportJobStatusEnum;
use App\Enums\ExportTaskEnum;
use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class UserTaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'type'       => ExportTaskEnum::get($this->type),
            'status'     => [
                'id'   => $this->status,
                'name' => ExportJobStatusEnum::get($this->status)
            ],
            'worker' => new WorkerMinimalResource($this->user->worker),
            'file'       => Helper::fileUrl($this->file),
            'read_at' => $this->read_at,
            'created_at' => $this->created_at->toDateTimeString(),
            'updated_at' => $this->updated_at->toDateTimeString()
        ];
    }
}
