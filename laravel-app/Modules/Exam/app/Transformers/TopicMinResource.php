<?php

namespace Modules\Exam\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Exam\Enums\TopicTypeEnum;

class TopicMinResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'  => $this->id,
            'name' => $this->name,
            'type' => [
                'id' => $this->type,
                'name' => TopicTypeEnum::get($this->type),
            ]
        ];
    }
}
