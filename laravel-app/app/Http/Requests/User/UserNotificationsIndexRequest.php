<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UserNotificationsIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'count' => ['nullable'],
            'read_at' => ['nullable'],
        ];
    }

    public function filters(): array
    {
        $filters = $this->validated();

        if ($this->has('count')) {
            $filters['count'] = true;
        }

        if ($this->has('read_at')) {
            $filters['read_at'] = true;
        }

        return $filters;
    }
}
