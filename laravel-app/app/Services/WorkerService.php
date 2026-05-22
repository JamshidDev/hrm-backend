<?php

namespace App\Services;

use App\Helpers\ConvertHelper;
use App\Models\User;
use App\Traits\Base64FileUploadTrait;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Models\CommandConfirmation;
use Modules\Confirmation\Models\ContractAdditionalConfirmation;
use Modules\Confirmation\Models\ContractConfirmation;
use Modules\HR\Models\Contract;
use Modules\HR\Models\ContractAdditional;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPhone;
use Modules\HR\Models\WorkerPhoto;

class WorkerService
{
    use Base64FileUploadTrait;

    public function store($request): Worker
    {
        $request->validate([
            'pin' => 'required|min:14|max:14|unique:workers,pin',
            'last_name' => 'required',
            'first_name' => 'required',
            "county_id" => 'nullable|exists:countries,id',
            "region_id" => 'nullable|exists:regions,id',
            "city_id" => 'nullable|exists:cities,id',
            "current_region_id" => 'nullable|exists:regions,id',
            "current_city_id" => 'nullable|exists:cities,id',
            'birthday' => 'date',
            'nationality_id' => 'required|exists:nationalities,id',
            'phones' => 'array',
            'user_phone' => 'integer|unique:users,phone',
            'work_experience' => 'required',
        ]);

        $worker = Worker::create($request->all());

        if (count($request->photos ?? [])) {
            foreach ($request->photos as $photo) {
                $photo['photo'] = ConvertHelper::optimizeBase64Image($photo['photo']);
                $base64 = $this->uploadBase64File($photo['photo'], 'worker-photos', ['jpg', 'jpeg', 'png']);
                if ($photo['current']) {
                    WorkerPhoto::where('worker_id', $worker->id)->update(['current' => false]);
                    $worker->update(['photo' => $base64]);
                }
                WorkerPhoto::create([
                    'worker_id' => $worker->id,
                    'photo' => $base64,
                    'current' => $photo['current']
                ]);
            }
        }

        foreach ($request->phones as $phone) {
            if (strlen($phone) !== 9) {
                continue;
            }
            WorkerPhone::create([
                'worker_id' => $worker->id,
                'phone' => $phone
            ]);
        }

        User::create([
            'organization_id' => auth()->user()->organization_id ?? null,
            'phone' => $request->user_phone,
            'pin' => $request->pin,
            'password' => bcrypt($request->pin),
            'password_changed_at' => now(),
            'worker_id' => $worker->id
        ]);
        return $worker;
    }
}
