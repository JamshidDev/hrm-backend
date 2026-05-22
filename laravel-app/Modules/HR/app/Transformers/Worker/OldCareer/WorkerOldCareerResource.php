<?php

namespace Modules\HR\Transformers\Worker\OldCareer;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkerOldCareerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sort' => $this->sort,
            'from_date' => $this->from_date,
            'to_date' => $this->to_date,
            'post_name' => $this->post_name
        ];
    }
}
