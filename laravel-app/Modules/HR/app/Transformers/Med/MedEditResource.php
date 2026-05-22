<?php

namespace Modules\HR\Transformers\Med;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\MedStatusEnum;
use Modules\HR\Transformers\Worker\WorkerInfoResource;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class MedEditResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        if ($this->worker_position_id) {
            $this->load([
                'worker_position.worker:id,last_name,first_name,middle_name,photo',
                'worker_position.position',
                'worker_position.department:id,name,level',
                'worker_position.organization:id,name,name_en,name_ru,group,full_name',
            ]);

            $workerPosition = new WorkerPositionMinimalResource($this->worker_position);
            $worker = null;
        } else {
            $this->load([
                'worker:id,last_name,first_name,middle_name'
            ]);
            $workerPosition = null;
            $worker = new WorkerInfoResource($this->worker);
        }

        return [
            'id'              => $this->id,
            'worker'          => $worker,
            'worker_position' => $workerPosition,
            'organization'    => new OrganizationListResource($this->organization),
            'status'          => [
                'id'   => $this->status,
                'name' => MedStatusEnum::get($this->status)
            ],
            'from'            => $this->from,
            'to'              => $this->to,
            'file'            => Helper::fileUrl($this->file),
            'comment'         => $this->comment,
            'current'         => $this->current
        ];
    }
}
