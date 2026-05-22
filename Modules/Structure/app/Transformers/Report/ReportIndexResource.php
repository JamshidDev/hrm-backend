<?php

namespace Modules\Structure\Transformers\Report;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class ReportIndexResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'year' => $this->year,
            'month' => $this->month,
            'organization' => new OrganizationListResource($this->whenLoaded('organization')),
            'file' => Helper::fileUrl($this->file),
            'confirmation_file' => Helper::fileUrl($this->confirmation_file),
            'confirmation' => [
                'id' => $this->confirmation,
                'name' => ConfirmationStatusEnum::tryFrom($this->confirmation)?->label(),
            ],
            'generate' => $this->generate,
            'created_at' => $this->created_at,
            'details_count' => $this->details_count,
        ];
    }
}
