<?php

namespace Modules\HR\Services;

use App\Traits\Base64FileUploadTrait;
use Illuminate\Support\Facades\DB;
use Modules\HR\DTO\WorkerPhotoDTO;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPhoto;

class WorkerPhotoService
{
    use Base64FileUploadTrait;

    public function store(WorkerPhotoDTO $dto)
    {
        return DB::transaction(function () use ($dto) {

            $worker = Worker::find($dto->workerId);
            $photoPath = $this->uploadBase64File(
                $dto->photoBase64,
                'worker-photos',
                ['jpg', 'jpeg', 'png']
            );

            if ($dto->current) {
                WorkerPhoto::where('worker_id', $dto->workerId)
                    ->update(['current' => false]);

                $worker->update(['photo' => $photoPath]);
            }

            WorkerPhoto::create([
                'worker_id' => $dto->workerId,
                'photo'     => $photoPath,
                'current'   => $dto->current,
            ]);

            return WorkerPhoto::where('worker_id', $dto->workerId)->get();
        });
    }

    public function update($photoId, array $data): void
    {
        DB::transaction(function () use ($photoId, $data) {

            $photo = WorkerPhoto::find((int)$photoId);

            if (!$photo) {
                throw HRServiceException::userNotFound(trans('messages.user_not_found'), 400);
            }

            if (!empty($data['photo'])) {
                $photo->photo = $this->uploadBase64File(
                    $data['photo'],
                    'worker-photos',
                    ['jpg', 'jpeg', 'png']
                );
            }

            if (!empty($data['current'])) {
                WorkerPhoto::where('worker_id', $photo->worker_id)
                    ->where('id', '!=', $photo->id)
                    ->update(['current' => false]);

                $photo->current = true;
                $photo->worker->update(['photo' => $photo->photo]);
            }

            $photo->save();
        });
    }

    public function delete($photoId): void
    {
        $photo = WorkerPhoto::find((int)$photoId);

        if (!$photo) {
            throw HRServiceException::userNotFound(trans('messages.user_not_found'), 400);
        }

        if ($photo->current) {
            throw HRServiceException::currentPhotoCannotBeDeleted(trans('messages.does_not_delete_current_photo'));
        }

        $photo->delete();
    }
}
