<?php

namespace Modules\HR\Http\Requests\Nationality;

use Illuminate\Foundation\Http\FormRequest;
use Modules\HR\DTO\NationalityDTO;

class NationalityUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['name'  => ['string']];
    }

    public function toDto(): NationalityDTO
    {
        return new NationalityDTO(
            name: $this->validated('name')
        );
    }
}
