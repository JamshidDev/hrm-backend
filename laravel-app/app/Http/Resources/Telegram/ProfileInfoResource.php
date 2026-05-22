<?php

namespace App\Http\Resources\Telegram;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\EducationEnum;
use Modules\HR\Transformers\Worker\WorkerPhonesResource;
use Modules\HR\Transformers\Worker\WorkerPhotosResource;

class ProfileInfoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'birthday' => $this->birthday,
            'pin' => $this->pin,
            'education' => EducationEnum::get($this->education),
            'phones' => WorkerPhonesResource::collection($this->phones),
            'photos' => WorkerPhotosResource::collection($this->photos),
            'positions' => $this->positions->map(function ($position) {
                return [
                    'organization' => $position->organization?->full_name,
                    'department' => $position->department?->name,
                    'position' => $position->position?->name,
                ];
            })
        ];
    }
}
