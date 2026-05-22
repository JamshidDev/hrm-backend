<?php

namespace Modules\HR\Transformers\Command;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class PositionInstructionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'created' => $this->created,
            'number' => $this->number,
            'file' => Helper::fileUrl($this->file),
            'confirmation_file' => Helper::fileUrl($this->confirmation_file),
            'organization' => new OrganizationListResource($this->organization),
            'confirmation' => [
                'id' => $this->confirmation,
                'name' => ConfirmationStatusEnum::get($this->confirmation)
            ]
        ];
    }
}
