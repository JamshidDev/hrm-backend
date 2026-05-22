<?php

namespace Modules\HR\Transformers\Command;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Enums\CommandTypeEnum;
use Modules\HR\Transformers\ConfirmationWorker\ConfirmationMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class CommandResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'command_number' => $this->command_number,
            'command_date' => $this->command_date,
            'workers' => ConfirmationMinimalResource::collection($this->confirmations->where('type', 'w')),
            'type' => [
                'id' => $this->type,
                'name' => CommandTypeEnum::tryFrom(($this->type))?->label()
            ],
            'file' => Helper::fileUrl($this->file),
            'confirmation_file' => Helper::fileUrl($this->confirmation_file),
            'organization' => new OrganizationListResource($this->organization),
            'generate' => $this->generate,
            'created_at' => $this->created_at,
            'confirmation' => [
                'id' => $this->confirmation,
                'name' => ConfirmationStatusEnum::tryFrom($this->confirmation)?->label(),
            ]
        ];
    }
}
