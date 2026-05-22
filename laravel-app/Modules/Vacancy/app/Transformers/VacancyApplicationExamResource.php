<?php

namespace Modules\Vacancy\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VacancyApplicationExamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'created' => $this->created,
            'ended' => $this->ended,
            'result' => $this->result,
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent
        ];
    }
}
