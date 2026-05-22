<?php

namespace Modules\HR\Http\Requests\Worker;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWorkerRequest extends FormRequest
{

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string'],
            'last_name' => ['required', 'string'],
            'middle_name' => ['nullable', 'string'],
            'birthday' => ['required', 'date'],
            'sex' => ['required', 'integer'],
            'marital_status' => ['required', 'integer'],
            'country_id' => ['required', 'exists:countries,id'],
            'city_id' => ['required', 'exists:cities,id'],
            'region_id' => ['required', 'exists:regions,id'],
            'current_region_id' => ['required', 'exists:regions,id'],
            'current_city_id' => ['required', 'exists:cities,id'],
            'nationality_id' => ['required', 'exists:nationalities,id'],
            'address' => ['nullable', 'string'],
            'phones' => ['nullable', 'array'],
            'work_experience' => ['nullable', 'string'],
            'experience_date' => ['nullable', 'date'],
            'education' => ['nullable', 'integer'],
            'pin' => ['nullable', 'string'],
            'user_phone' => ['nullable', 'string'],
            'update_password' => ['nullable', 'bool']
        ];
    }


    public function authorize(): bool
    {
        return true;
    }
}
