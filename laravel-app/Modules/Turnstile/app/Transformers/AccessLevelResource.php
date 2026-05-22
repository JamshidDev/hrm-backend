<?php

namespace Modules\Turnstile\Transformers;

use Cache;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

class AccessLevelResource extends JsonResource
{
    protected Collection $devicesCache;

    public function __construct($resource, $devicesCache = null)
    {
        parent::__construct($resource);
        $this->devicesCache = $devicesCache ?? collect();
    }

    public function toArray(Request $request): array
    {
        $devices = $this->devicesCache
            ->whereIn('device_id', $this->devices)
            ->map(fn($item) => [
                'id'     => $item->device_id,
                'name'   => $item->name,
                'status' => $item->status ? 1 : 2,
            ])
            ->values();

        return [
            'id' => $this->id,
            'hik_server' => 'isup.das-uty.uz',
            'name' => $this->name,
            'description' => $this->description,
            'devices_count' => $this->devices_count ?? 0,
            'department' => new HikCentralDepartmentResource($this->department),
            'devices' => $devices
        ];
    }
}
