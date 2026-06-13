<?php

namespace Modules\HR\Http\Requests\Department;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\DepartmentDTO;

class DepartmentStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string'],
            'name_ru' => ['nullable', 'string'],
            'name_en' => ['nullable', 'string'],
            'comment' => ['nullable', 'string'],
            'level' => ['required', 'integer'],
            'region_id' => ['nullable', 'integer'],
            'city_id' => ['required', 'integer'],
            'parent_id' => ['nullable', 'exists:departments,id'],
            'organization_id' => ['nullable', 'exists:organizations,id'],
        ];
    }

    public function toDto(): DepartmentDTO
    {
        $user = $this->user();

        return new DepartmentDTO(
            name: $this->validated('name'),
            nameRu: $this->validated('name_ru'),
            nameEn: $this->validated('name_en'),
            comment: $this->validated('comment'),
            level: $this->validated('level'),
            regionId: $this->validated('region_id'),
            cityId: $this->validated('city_id'),
            organizationId: $this->validated('organization_id') ?? $user->organization_id,
            parentId: $this->validated('parent_id')
        );
    }
}
