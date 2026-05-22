<?php

namespace Modules\LMS\Transformers;

use App\Helpers\PositionHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class WorkerPositionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'worker'          => new WorkerMinimalResource($this->worker),
            'phones' => $this->worker->phones->map(fn($phone) => $phone->phone),
            'post_short_name' => PositionHelper::getShortPosition($this),
            'organization' => new OrganizationListResource($this->organization)
        ];
    }
}
