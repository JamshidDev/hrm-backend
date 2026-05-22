<?php

namespace Modules\HR\Transformers\Contract;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Enums\ContractCommandStatusEnum;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Transformers\Worker\WorkerInfoResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class ContractResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'number'            => $this->number,
            'worker'            => new WorkerInfoResource($this->worker),
            'organization'      => new OrganizationListResource($this->organization),
            'file'              => Helper::fileUrl($this->file),
            'confirmation_file' => Helper::fileUrl($this->confirmation_file),
            'contract_date'     => $this->contract_date,
            'type'              => [
                'id'   => $this->type,
                'name' => ContractTypeEnum::get($this->type)
            ],
            'command_status'    => [
                'id'   => $this->command_status,
                'name' => ContractCommandStatusEnum::get($this->command_status)
            ],
            'status'            => [
                'id'   => $this->status,
                'name' => PositionStatusEnum::get($this->status)
            ],
            'confirmation'      => [
                'id'   => $this->confirmation,
                'name' => ConfirmationStatusEnum::get($this->confirmation)
            ],
            'generate' => $this->generate,
            'created_at' => $this->created_at,
            'creator' => $this->user_id
        ];
    }
}
