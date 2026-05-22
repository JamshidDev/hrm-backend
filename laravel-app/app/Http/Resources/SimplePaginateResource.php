<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SimplePaginateResource extends JsonResource
{
    public function __construct($resource, public $resourceClass = null)
    {
        parent::__construct($resource);
    }

    public function collect($resource)
    {
        return $this->resourceClass::collection($resource);
    }

    public function toArray($request): array
    {
        return [
            'current_page' => $this->currentPage(),
            'data'         => $this->collect($this->items()),
            'next' => $this->next
        ];
    }
}
