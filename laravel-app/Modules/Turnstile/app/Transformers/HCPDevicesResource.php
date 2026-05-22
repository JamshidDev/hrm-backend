<?php

namespace Modules\Turnstile\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Organization\OrganizationCodeResource;

class HCPDevicesResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization_id' => new OrganizationCodeResource($this->organization),
            'name' => $this->name,
            'ip_address' => $this->ip_address,
            'mac_address' => $this->mac_address,
            'status' => $this->status,
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
            'serial_number' => $this->serial_number,
            'device_id' => $this->device_id,
            'log' => $this->log,
            'config' => $this->config,
            'upload_workers' => $this->upload_workers,
            'device_code' => $this->device_code,
            'contract_number' => $this->contract_number,
            'contract_date' => $this->contract_date,
            'price' => $this->price,
        ];
    }
}
