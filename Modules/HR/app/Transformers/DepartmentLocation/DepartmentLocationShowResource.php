<?php

namespace Modules\HR\Transformers\DepartmentLocation;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DepartmentLocationShowResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'department_id' => $this->department_id,
            'geo_type' => $this->geo_type,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'radius' => $this->radius,
            'polygon' => $this->polygon,
            'accuracy_limit' => $this->accuracy_limit,
            'department' => $this->whenLoaded('department', function () {
                return [
                    'id' => $this->department?->id,
                    'name' => $this->department?->name,
                    'organization_id' => $this->department?->organization_id,
                    'organization_name' => $this->department?->organization?->name,
                ];
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
