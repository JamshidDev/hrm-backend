<?php

namespace Modules\Exam\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Exam\Enums\TopicTypeEnum;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class TopicOnlyResource extends JsonResource
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
            'files' => TopicFileResource::collection($this->files)
        ];
    }
}
