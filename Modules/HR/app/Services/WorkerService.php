<?php

namespace Modules\HR\Services;

use App\Helpers\ConvertHelper;
use App\Models\User;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Support\Facades\DB;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Models\CommandConfirmation;
use Modules\HR\DTO\WorkerDTO;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\Contract;
use Modules\HR\Models\ContractAdditional;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPhone;
use Modules\HR\Models\WorkerPhoto;
use Spatie\Permission\Models\Role;

class WorkerService
{
    use Base64FileUploadTrait;

    public function store(WorkerDTO $dto): Worker
    {
        if (Worker::wherePin((int)$dto->workerData['pin'])->exists()) {
            throw HRServiceException::workerAlreadyExists(trans('messages.user_all_ready'));
        }
        return DB::transaction(function () use ($dto) {
            $worker = Worker::create($dto->workerData);
            $this->syncPhotos($worker, $dto->photos);
            $this->syncPhones($worker, $dto->phones);
            $this->createUser($worker, $dto->userPhone);

            return $worker;
        });
    }

    public function update(Worker $worker, WorkerDTO $dto): void
    {
        if (Worker::wherePin((int)$dto->workerData['pin'])->whereNot('id', $worker->id)->exists()) {
            throw HRServiceException::workerAlreadyExists(trans('messages.user_all_ready'));
        }
        DB::transaction(function () use ($worker, $dto) {

            if ($dto->updatePassword) {
                $this->updatePassword($worker);
                return;
            }

            $worker->update($dto->workerData);

            if ($dto->phones !== null) {
                WorkerPhone::where('worker_id', $worker->id)->forceDelete();
                $this->syncPhones($worker, $dto->phones);
            }

            if ($dto->userPhone) {
                $this->syncUser($worker, $dto->userPhone);
            }
        });
    }


    private function syncPhotos(Worker $worker, ?array $photos): void
    {
        if (!$photos) {
            return;
        }

        foreach ($photos as $photo) {
            $base64 = ConvertHelper::optimizeBase64Image($photo['photo']);
            $path = $this->uploadBase64File($base64, 'worker-photos', ['jpg','jpeg','png']);

            if ($photo['current']) {
                WorkerPhoto::where('worker_id', $worker->id)->update(['current' => false]);
                $worker->update(['photo' => $path]);
            }

            WorkerPhoto::create([
                'worker_id' => $worker->id,
                'photo' => $path,
                'current' => $photo['current']
            ]);
        }
    }

    public function syncPhones(Worker $worker, ?array $phones): void
    {
        if (!$phones) {
            return;
        }

        foreach ($phones as $phone) {
            if (strlen($phone) !== 9) {
                continue;
            }

            WorkerPhone::create([
                'worker_id' => $worker->id,
                'phone' => $phone
            ]);
        }
    }

    private function createUser(Worker $worker, string $phone): void
    {
        if (User::query()->where('phone', $phone)->exists()) {
            throw HRServiceException::workerPhoneExists(trans('messages.worker_phone_exists'));
        }
        User::create([
            'organization_id' => auth()->user()->organization_id,
            'phone' => $phone,
            'pin' => $worker->pin,
            'password' => bcrypt($worker->pin),
            'password_changed_at' => now(),
            'worker_id' => $worker->id
        ]);
    }

    private function syncUser(Worker $worker, string $phone): void
    {
        $user = $worker->profile;

        if ($user) {
            if (User::query()
                ->whereNot('id', $user->id)
                ->where('phone', $phone)
                ->exists()) {
                throw HRServiceException::workerPhoneExists(trans('messages.worker_phone_exists'));
            }
        } else {
            if (User::query()
                ->where('phone', $phone)
                ->exists()) {
                throw HRServiceException::workerPhoneExists(trans('messages.worker_phone_exists'));
            }
            $user = new User([
                'worker_id' => $worker->id,
                'password' => bcrypt($worker->pin),
            ]);
        }

        $user->phone = $phone;
        $user->organization_id = auth()->user()->organization_id;
        $user->save();

        if (!$user->roles()->exists()) {
            $role = Role::findByName('Worker');
            $user->roles()->attach($role->id, [
                'organization_id' => $user->organization_id,
                'model_type' => User::class,
            ]);
        }
    }

    private function updatePassword(Worker $worker): void
    {
        $user = $worker->profile;
        if ($user) {
            $user->password = bcrypt($worker->pin);
            $user->save();
        }
    }


    public function checkWorkerDocument($workerId): array
    {
        if ($workerId === 1) {
            return ['status' => true];
        }
        $commands = CommandConfirmation::query()
            ->where('worker_id', $workerId)
            ->where('type', 'w')
            ->whereHas('command', function ($query) {
                $query->where('confirmation','!=', ConfirmationStatusEnum::SUCCESS->value);
            })->exists();

        if ($commands) {
            return [
                'status' => false,
                'type' => 'command'
            ];
        }

        $contractAdd = ContractAdditional::query()
            ->where('worker_id', $workerId)
            ->whereNot('confirmation', ConfirmationStatusEnum::SUCCESS->value)
            ->exists();
        if ($contractAdd) {
            return [
                'status' => false,
                'type' => 'contract_additional'
            ];
        }

        $contract = Contract::query()
            ->where('worker_id', $workerId)
            ->whereNot('confirmation', ConfirmationStatusEnum::SUCCESS->value)
            ->exists();

        if ($contract) {
            return [
                'status' => false,
                'type' => 'contract'
            ];
        }

        return ['status' => true];
    }
}
