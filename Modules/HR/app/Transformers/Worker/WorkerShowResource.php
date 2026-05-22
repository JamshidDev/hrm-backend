<?php

namespace Modules\HR\Transformers\Worker;

use App\Http\Resources\User\UserRolesResource;
use App\Http\Resources\User\UserWorkerResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\MaritalStatusEnum;
use Modules\HR\Transformers\Nationality\NationalityResource;
use Modules\HR\Transformers\WorkerPosition\WorkerShowPositionResource;
use Modules\Structure\Transformers\Structure\OnlyCityResource;
use Modules\Structure\Transformers\Structure\OnlyCountryResource;
use Modules\Structure\Transformers\Structure\OnlyRegionResource;
use Spatie\Permission\Models\Role;

class WorkerShowResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = null;
        if (!$this->profile) {
            $user = User::query()
                ->wherePhone($this->load('phones')->phones->first()?->phone)
                ->with('organization')
                ->first();

        }

        if ($this->profile && !count($this->profile->roles)) {
            $newUser = $this->profile;
            $role = Role::find(2);
            $organizationId = $this->positions->first()->organization_id;
            $newUser->roles()->attach($role->id, [
                'organization_id' => $organizationId,
                'model_type' => User::class,
            ]);
            $newUser->organization_id = $organizationId;
            $newUser->save();
        }

        return [
            'uuid'            => $this->uuid,
            'id'              => $this->id,
            'photos'          => WorkerPhotosResource::collection($this->photos->sortBy('id')),
            'phones'          => WorkerPhonesResource::collection($this->phones),
            'languages'       => LanguageResource::collection($this->languages),
            'passports'       => WorkerPassportResource::collection($this->passports),
            'last_name'       => $this->last_name,
            'first_name'      => $this->first_name,
            'middle_name'     => $this->middle_name,
            'birthday'        => $this->birthday,
            'pin'             => $this->pin,
            'education' => $this->education,
            'address'         => $this->address,
            'sex'             => $this->sex ? 1 : 0,
            'nationality'     => new NationalityResource($this->nationality),
            'marital_status'  => [
                'id'   => $this->marital_status,
                'name' => MaritalStatusEnum::get($this->marital_status)
            ],
            'work_experience' => $this->work_experience,
            'experience_date' => $this->experience_date,
            'region'          => new OnlyRegionResource($this->region),
            'city'            => new OnlyCityResource($this->city),
            'country'         => new OnlyCountryResource($this->country),
            'current_region'  => new OnlyRegionResource($this->current_region),
            'current_city'    => new OnlyCityResource($this->current_city),
            'profile'         => new UserRolesResource($this->profile),
            'positions' => WorkerShowPositionResource::collection($this->positions),
            'another_profile' => $user ? new UserWorkerResource($user) : null
        ];
    }
}
