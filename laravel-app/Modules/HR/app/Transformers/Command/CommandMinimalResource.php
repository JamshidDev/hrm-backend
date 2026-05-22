<?php

namespace Modules\HR\Transformers\Command;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\CommandTypeEnum;

class CommandMinimalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'command_number'    => $this->command_number,
            'command_date'      => $this->command_date,
            'confirmation_file' => $this->confirmation_file,
            'type'              => [
                'id'   => $this->type,
                'name' => CommandTypeEnum::tryFrom(($this->type))?->label()
            ],
        ];
    }
}
