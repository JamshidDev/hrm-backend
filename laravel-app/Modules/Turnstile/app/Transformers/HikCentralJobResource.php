<?php

namespace Modules\Turnstile\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HikCentralJobResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'name'           => $this->name,
            'exported_count' => $this->exported_count,
            'status'         => $this->status,
            'workers_count'  => $this->workers_count,
            'errors'         => $this->errors,
            'error_workers_count' => $this->error_workers_count,
            'created_at'     => $this->created_at
        ];
    }
}
