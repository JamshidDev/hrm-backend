<?php

namespace Modules\HR\Http\Requests\OrganizationLeader;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\OrganizationLeaderDTO;

class OrganizationLeaderStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'organization_id'    => ['required', 'exists:organizations,id'],
            'worker_position_id' => ['required', 'exists:worker_positions,id'],
            'phones'             => ['nullable', 'array'],
            'phones.*'           => ['string'],
        ];
    }

    public function toDto(): OrganizationLeaderDTO
    {
        return new OrganizationLeaderDTO(
            organizationId: $this->validated('organization_id'),
            workerPositionId: $this->validated('worker_position_id'),
            phones: $this->validated('phones')
        );
    }
}
