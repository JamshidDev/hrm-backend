<?php

namespace Modules\HR\Http\Requests\DepartmentLocation;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\Services\DepartmentLocationService;

class DepartmentLocationUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $polygon = new DepartmentLocationService()->normalizePolygon($this->input('polygon'));

        $this->merge([
            'polygon' => $polygon,
        ]);
    }

    public function rules(): array
    {
        $isPolygon = filter_var($this->input('geo_type'), FILTER_VALIDATE_BOOL);

        return [
            'department_id' => [
                'required',
                'integer',
                'exists:departments,id',
            ],
            'geo_type' => ['required', 'boolean'],
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'radius' => [$isPolygon ? 'nullable' : 'required', 'integer', 'min:1'],
            'polygon' => [$isPolygon ? 'required' : 'nullable', 'array', 'min:3'],
            'polygon.*.lat' => ['required_with:polygon', 'numeric', 'between:-90,90'],
            'polygon.*.lng' => ['required_with:polygon', 'numeric', 'between:-180,180'],
            'accuracy_limit' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
