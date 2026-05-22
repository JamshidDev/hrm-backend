<?php

namespace Modules\HR\Http\Requests\Pensioner;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\PensionerDTO;

class PensionerStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'last_name' => ['required', 'string'],
            'first_name' => ['required', 'string'],
            'middle_name' => ['required', 'string'],
            'sex' => ['nullable', 'boolean'],
            'position' => ['required', 'string'],
            'address' => ['required', 'string'],
            'pin' => ['required'],
            'passport' => ['required', 'string'],
            'experience' => ['required'],
            'year' => ['required'],
            'phone' => ['required'],
            'afghan' => ['boolean'],
            'invalid' => ['boolean'],
            'chernobyl' => ['boolean'],
            'railway_title' => ['boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'phone' => str_replace(['(', ')'], '', $this->phone),
        ]);
    }

    public function toDto(): PensionerDTO
    {
        $user = $this->user();

        return new PensionerDTO(
            lastName: $this->validated('last_name'),
            firstName: $this->validated('first_name'),
            middleName: $this->validated('middle_name'),
            sex: $this->validated('sex'),
            position: $this->validated('position'),
            address: $this->validated('address'),
            pin: $this->validated('pin'),
            passport: $this->validated('passport'),
            experience: $this->validated('experience'),
            year: $this->validated('year'),
            phone: $this->validated('phone'),
            afghan: (bool) $this->validated('afghan'),
            invalid: (bool) $this->validated('invalid'),
            chernobyl: (bool) $this->validated('chernobyl'),
            railwayTitle: (bool) $this->validated('railway_title'),
            organizationId: $user->organization_id,
        );
    }
}
