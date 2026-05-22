<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PaginationResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'current_page' => $this->currentPage(),
            'total'        => $this->total(),
            'data'         => $this->items(),
        ];
    }
}
