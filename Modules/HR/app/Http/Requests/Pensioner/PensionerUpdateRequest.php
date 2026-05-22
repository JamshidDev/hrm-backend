<?php

namespace Modules\HR\Http\Requests\Pensioner;

use Illuminate\Foundation\Http\FormRequest;

class PensionerUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'last_name' => ['sometimes', 'required'],
            'first_name' => ['sometimes', 'required'],
            'middle_name' => ['sometimes', 'required'],
            'sex' => ['sometimes', 'boolean'],
            'position' => ['sometimes', 'required'],
            'address' => ['sometimes', 'required'],
            'pin' => ['sometimes', 'required'],
            'passport' => ['sometimes', 'required'],
            'experience' => ['sometimes', 'required'],
            'year' => ['sometimes', 'required'],
            'phone' => ['sometimes', 'required'],
            'afghan' => ['sometimes', 'boolean'],
            'invalid' => ['sometimes', 'boolean'],
            'chernobyl' => ['sometimes', 'boolean'],
            'railway_title' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->phone) {
            $this->merge([
                'phone' => str_replace(['(', ')'], '', $this->phone),
            ]);
        }
    }

    public function toArrayData(): array
    {
        return $this->validated();
    }
}
