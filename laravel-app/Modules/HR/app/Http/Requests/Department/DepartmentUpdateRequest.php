<?php

namespace Modules\HR\Http\Requests\Department;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\DepartmentDTO;
use Modules\HR\Models\Department;

class DepartmentUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required'],
            'name_ru' => ['nullable'],
            'name_en' => ['nullable'],
            'comment' => ['nullable'],
            'level' => ['required', 'integer'],
            'parent_id' => ['nullable', 'exists:departments,id'],
        ];
    }

    public function toDto(Department $department): DepartmentDTO
    {
        $user = $this->user();

        return new DepartmentDTO(
            name: $this->validated('name'),
            nameRu: $this->validated('name_ru'),
            nameEn: $this->validated('name_en'),
            comment: $this->validated('comment'),
            level: $this->validated('level'),
            organizationId: $user->organization_id,
            parentId: $this->validated('parent_id')
        );
    }
}
