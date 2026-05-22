<?php

namespace Modules\HR\Transformers\OrganizationDocument;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\OrganizationDocumentTypeEnum;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class OrganizationDocumentResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'organization'    => new OrganizationListResource($this->organization),
            'file'            => Helper::fileUrl($this->file),
            'title'           => $this->title,
            'description'     => $this->description,
            'type'            => [
                'id'   => $this->type,
                'name' => OrganizationDocumentTypeEnum::tryFrom($this->type)?->label()
            ],
            'visibility_type' => $this->visibility_type,
            'document_date'   => $this->document_date
        ];
    }
}
