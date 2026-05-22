<?php

namespace Modules\Turnstile\Transformers;

use App\Helpers\PositionHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class WorkerTerminalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'worker' => new WorkerMinimalResource($this->worker),
            'post_name' => PositionHelper::getShortPosition($this),
            'terminals_count' => $this->worker->terminals->count(),
        ];
    }
}
