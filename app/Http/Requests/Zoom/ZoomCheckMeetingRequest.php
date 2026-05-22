<?php

namespace App\Http\Requests\Zoom;

use Illuminate\Foundation\Http\FormRequest;

class ZoomCheckMeetingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'meet_uuid' => ['required', 'string'],
            'meet_id' => ['required', 'string'],
        ];
    }
}
