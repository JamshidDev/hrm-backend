<?php

namespace Modules\Economist\Http\Requests\Statement;

use Illuminate\Foundation\Http\FormRequest;

class StatementIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'year' => ['nullable', 'integer', 'min:2010', 'max:2030'],
            'month' => ['nullable', 'integer', 'min:1', 'max:12'],
            'organizations' => ['nullable', 'string'],
            'search' => ['nullable', 'string', 'max:255'],
            'code' => ['nullable', 'digits:3'],
            'start_hours' => ['nullable', 'numeric', 'min:0'],
            'end_hours' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable'],
            'sort_by' => ['nullable', 'string', 'in:id,organization_id,worker_id,main_salary,work_time,full_name,position,pin,year,month,total_one,total_two,total_three,total_four,total_five'],
            'sort_order' => ['nullable', 'string', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ];
    }
}
