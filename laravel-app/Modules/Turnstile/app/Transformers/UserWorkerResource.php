<?php

namespace Modules\Turnstile\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserWorkerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $worker = $this->worker;
        return [
            'id' => $this->id,
            'last_name' => $worker->last_name,
            'first_name' => $worker->first_name,
            'middle_name' => $worker->middle_name
        ];
    }
}
