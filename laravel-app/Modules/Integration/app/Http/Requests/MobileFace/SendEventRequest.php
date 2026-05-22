<?php

namespace Modules\Integration\Http\Requests\MobileFace;

use Illuminate\Foundation\Http\FormRequest;

class SendEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'event_date_and_time' => 'required|date_format:Y-m-d H:i:s',
            'event_type' => 'required|boolean',
            'pin' => 'required|integer|digits:14',
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
            'photo' => [
                'nullable',
                'url',
                function ($attribute, $value, $fail) {
                    $allowedExtensions = ['jpg', 'jpeg', 'png'];
                    $ext = pathinfo(parse_url($value, PHP_URL_PATH), PATHINFO_EXTENSION);
                    if (!in_array(strtolower($ext), $allowedExtensions)) {
                        $fail($attribute . ' must be a valid image URL (' . implode(',', $allowedExtensions) . ')');
                    }
                },
            ],
            'organization' => 'required|string'
        ];
    }
}
