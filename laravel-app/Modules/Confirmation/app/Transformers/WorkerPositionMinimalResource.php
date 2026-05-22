<?php

namespace Modules\Confirmation\Transformers;

use App\Helpers\PositionHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class WorkerPositionMinimalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization' => new OrganizationListResource($this->organization),
            'post_name' => PositionHelper::getFullPosition($this),
            'post_short_name' => PositionHelper::getShortPosition($this)
        ];
    }
}
