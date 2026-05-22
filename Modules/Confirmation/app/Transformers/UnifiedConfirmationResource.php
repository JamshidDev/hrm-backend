<?php

namespace Modules\Confirmation\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;
use Modules\HR\Models\Command;
use Modules\HR\Models\Contract;
use Modules\HR\Models\WorkerApplication;
use Modules\HR\Transformers\Command\CommandInfoResource;
use Modules\HR\Transformers\Contract\ContractResource;
use Modules\HR\Transformers\WorkerApplication\WorkerApplicationResource;

class UnifiedConfirmationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'documentId' => $this->document_id,
            'status' => [
                'id' => $this->status,
                'name' => ConfirmationStatusEnum::get($this->status),
            ],
            'position' => $this->position,
            'confirmation_type' => [
                'id' => $this->confirmation_type,
                'name' => ConfirmationTypeEnum::get($this->confirmation_type),
            ],
            'main' => $this->main,
            'document' => $this->resolveDocument(),
        ];
    }

    protected function resolveDocument(): ContractResource|WorkerApplicationResource|CommandInfoResource|null
    {
        return match ($this->type) {
            'contracts' => new ContractResource(
                Contract::with(['worker', 'organization'])->find($this->document_id)
            ),

            'commands' => new CommandInfoResource(
                Command::with('organization')->find($this->document_id)
            ),

            'worker-application' => new WorkerApplicationResource(
                WorkerApplication::with(['worker', 'organization'])->find($this->document_id)
            ),

            default => null,
        };
    }
}