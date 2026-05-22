<?php

namespace Modules\HR\Http\Requests\DepartmentPosition;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\DepartmentPositionDTO;
use Modules\HR\Models\Department;

class DepartmentPositionStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'department_id' => ['required', 'exists:departments,id'],
            'position_id'   => ['required', 'exists:positions,id'],
            'rate'          => ['required', 'numeric'],
            'education' => ['required', 'integer'],
            'rank' => ['required'],
            'salary' => ['required'],
            'experience' => ['required'],
            'group' => ['required'],
            'max_rank'      => ['required'],
        ];
    }

    public function toDto(): DepartmentPositionDTO
    {
        $department = Department::findOrFail(
            $this->validated('department_id')
        );

        return new DepartmentPositionDTO(
            departmentId: $department->id,
            positionId: $this->validated('position_id'),
            rate: (float) $this->validated('rate'),
            education: $this->validated('education'),
            rank: $this->validated('rank'),
            salary: (int)$this->validated('salary'),
            experience: (int)$this->validated('experience'),
            maxRank: $this->validated('max_rank'),
            group: (int) $this->validated('group'),
            organizationId: $department->organization_id,
        );
    }
}
