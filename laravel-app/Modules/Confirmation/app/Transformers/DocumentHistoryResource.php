<?php

namespace Modules\Confirmation\Transformers;

use App\Helpers\Helper;
use App\Http\Resources\User\UserInfoResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\DocumentHistoryStatusEnum;

class DocumentHistoryResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'user'       => new UserInfoResource($this->user),
            'file'       => Helper::fileUrl($this->file),
            'description' => $this->description,
            'status'     => [
                'id'   => $this->status,
                'name' => DocumentHistoryStatusEnum::get($this->status)
            ],
            'created_at' => $this->created_at
        ];
    }
}
