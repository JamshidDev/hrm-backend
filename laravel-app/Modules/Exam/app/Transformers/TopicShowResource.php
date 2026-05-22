<?php

namespace Modules\Exam\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Exam\Enums\TopicTypeEnum;
use Modules\Exam\Enums\ExamWhomEnum;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class TopicShowResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'  => $this->id,
            'name' => $this->name,
            'organization' => new OrganizationListResource($this->organization),
            'type' => [
                'id' => $this->type,
                'name' => TopicTypeEnum::get($this->type),
            ],
            'whom' => [
                'id' => $this->whom,
                'name' => ExamWhomEnum::get($this->whom),
            ],
            'active' => $this->active
        ];
    }
}
