<?php

namespace Modules\HR\Transformers\Worker;

use App\Helpers\Helper;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\ContractTypeEnum;

class WorkerWithPositionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'photo' => Helper::fileUrl($this->photo),
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'birthday' => $this->birthday,
            'positions' => $this->positions->map(function ($position) use ($request) {
                if ($request->header('X-AUTH-TYPE') === 'sanctum')
                {
                    $hrs = User::query()
                        ->where('organization_id', $position->organization_id)
                        ->with(['worker'])
                        ->whereHas('roles', fn ($roles) => $roles->whereIn('name', ['HR','HRLeader']))
                        ->get()->map(function ($user) {
                            return [
                                'worker' => new WorkerMinimalResource($user->worker),
                                'phone' => $user->phone
                            ];
                        });
                }
                return [
                    'id' => $position->id,
                    'type' => ContractTypeEnum::tryFrom($position->type)?->label(),
                    'organization' => $position->organization?->full_name,
                    'position' => $position->position?->name,
                    'department' => $position->department?->name,
                    'position_date' => $position->position_date,
                    'hrs' => $hrs ?? null,
                ];
            })
        ];
    }
}
