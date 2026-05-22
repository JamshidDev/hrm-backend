<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class UserWorkerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'     => $this->id,
            'worker' => new WorkerMinimalResource($this->worker)
        ];
    }
}
