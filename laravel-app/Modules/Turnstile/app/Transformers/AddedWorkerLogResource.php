<?php

namespace Modules\Turnstile\Transformers;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class AddedWorkerLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user' => new \App\Http\Resources\User\UserWorkerResource($this->user),
            'worker' => new WorkerMinimalResource($this->worker),
            'photo' => Helper::fileUrl($this->worker_photo?->photo),
            'status' => $this->status,
            'created_at' => $this->created_at
        ];
    }
}
