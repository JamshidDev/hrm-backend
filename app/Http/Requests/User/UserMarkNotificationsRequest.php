<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UserMarkNotificationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $all = $this->boolean('all');

        return [
            'all' => ['nullable', 'boolean'],
            'ids' => [$all ? 'nullable' : 'required', 'array'],
            'ids.*' => ['string'],
        ];
    }
}
