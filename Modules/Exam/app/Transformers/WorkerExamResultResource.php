<?php

namespace Modules\Exam\Transformers;

use App\Http\Resources\User\UserInfoResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkerExamResultResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'created' => $this->created,
            'ended' => $this->ended,
            'result' => $this->result,
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent,
            'user' => new UserInfoResource($this->user)
        ];
    }
}
