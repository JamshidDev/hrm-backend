<?php

namespace Modules\LMS\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LearningCenterListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'users' => LearningCenterUsersResource::collection($this->users),
            'code' => $this->code,
            'name' => $this->name,
            'name_ru' => $this->name_ru,
            'name_en' => $this->name_en
        ];
    }
}
