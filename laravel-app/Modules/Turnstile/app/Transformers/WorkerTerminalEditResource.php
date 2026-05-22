<?php

namespace Modules\Turnstile\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class WorkerTerminalEditResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker' => new WorkerMinimalResource($this),
            'terminals' => $this->terminals->map(function ($terminal) {
                return [
                    'id' => $terminal->id,
                    'terminal' => new TerminalListResource($terminal->terminal),
                ];
            }),
        ];
    }
}
