<?php

namespace App\Http\Resources;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppInstructionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'menu' => $this->menu,
            'sub_menu' => $this->sub_menu,
            'title' => $this->title,
            'text' => $this->text,
            'photos' => $this->photos->map(function ($photo) {
                return [
                    'id' => $photo->id,
                    'photo' => Helper::fileUrl($photo->photo)
                ];
            })
        ];
    }
}
