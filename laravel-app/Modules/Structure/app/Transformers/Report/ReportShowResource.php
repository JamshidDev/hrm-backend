<?php

namespace Modules\Structure\Transformers\Report;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Transformers\ConfirmationWorkersResource;

class ReportShowResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'year' => $this->year,
            'month' => $this->month,
            'details' => ReportDetailsIndexResource::collection($this->details),
            'confirmations' => ConfirmationWorkersResource::collection($this->confirmations),
            'director' => new ConfirmationWorkersResource($this->director)
        ];
    }
}
