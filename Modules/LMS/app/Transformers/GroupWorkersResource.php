<?php

namespace Modules\LMS\Transformers;

use App\Helpers\PositionHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class GroupWorkersResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker' => new WorkerMinimalResource($this->worker),
            'position' => PositionHelper::getShortPosition($this->worker_position),
            'worker_position_id' => $this->worker_position_id,
            'certificate' => new CertificateMinResource($this->certificate)
        ];
    }
}
