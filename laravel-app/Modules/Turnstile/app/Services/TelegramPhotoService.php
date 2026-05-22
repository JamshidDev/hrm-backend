<?php

namespace Modules\Turnstile\Services;

use App\Helpers\ConvertHelper;
use App\Helpers\Helper;
use App\Helpers\QueryHelper;
use App\Http\Resources\PaginateResource;
use App\Services\HikCentralService;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPhoto;
use Modules\Turnstile\Exceptions\TurnstileServiceException;
use Modules\Turnstile\Models\HikCentralAccessLevel;
use Modules\Turnstile\Models\HikCentralDepartment;
use Modules\Turnstile\Models\TurnstileTelegramPhoto;
use Modules\Turnstile\Models\WorkerHikCentral;
use Modules\Turnstile\Transformers\TurnstileTelegramPhotoResource;

class TelegramPhotoService
{
    public function paginate(array $filters, $user)
    {
        $query = Worker::query()
            ->join('worker_positions as wp', function ($join) use ($user, $filters) {
                $join->on('wp.worker_id', '=', 'workers.id')
                    ->where('wp.status', PositionStatusEnum::ACTIVE->value)
                    ->whereNotIn('wp.organization_id', [1, 19])
                    ->when($filters['departments'] ?? null, function ($query, $departments) {
                        $query->whereIn('wp.department_id', explode(',', $departments));
                    });

                return QueryHelper::filterByOrganizations($join, $user, $filters);
            })
            ->select('workers.id');

        $data = TurnstileTelegramPhoto::query()
            ->whereIn('worker_id', $query)
            ->when($filters['search'] ?? null, fn($query) => $query->whereHas('worker', static fn($subQuery) => $subQuery->searchByFullName()))
            ->when($filters['status'] ?? null, fn($query, $status) => $query->where('status', $status))
            ->with(['worker:id,last_name,first_name,middle_name,photo,birthday', 'worker.access_levels'])
            ->when(($filters['status'] ?? null) === 2, fn($query) => $query->where('status', 2), fn($query) => $query->where('status', '!=', 2))
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 10);

        return PaginateResource::make($data, TurnstileTelegramPhotoResource::class);
    }

    public function updatePhotos(array $data, $user, HikCentralWorkerService $hikWorkerService): void
    {
        if ($data['status'] === 3) {
            TurnstileTelegramPhoto::query()
                ->whereIn('id', $data['ids'])
                ->update([
                    'status' => 3,
                    'error' => $data['comment'] ?? null,
                ]);
            return;
        }

        if (count($data['access_level_ids'] ?? []) > 5) {
            throw TurnstileServiceException::maxAccessLevelsExceeded(trans('messages.turnstile.max_access_level_5'));
        }

        $photos = TurnstileTelegramPhoto::query()
            ->whereIn('id', $data['ids'])
            ->with('worker')
            ->get();

        if (count($photos) < 4) {
            $this->applyPhotoUpdates($photos, $data, $user, $hikWorkerService);
        }
    }

    private function applyPhotoUpdates($photos, array $data, $user, HikCentralWorkerService $hikWorkerService): void
    {
        $now = now();

        foreach ($photos as $photo) {
            $photoBase64 = base64_encode(file_get_contents(Helper::fileUrl($photo->photo)));
            $workerPhoto = WorkerPhoto::query()->create([
                'worker_id' => $photo->worker_id,
                'photo' => $photo->photo,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            if (strlen($photoBase64) >= 204800) {
                $photoBase64 = ConvertHelper::compressBase64Image($photoBase64);
                $photoBase64 = preg_replace('/^data:image\/[a-zA-Z]+;base64,/', '', $photoBase64);
            }

            if (!$photo->hcp_person_id) {
                $accessLevels = HikCentralAccessLevel::whereIn('id', $data['access_level_ids'] ?? [])->get();
                $departmentId = HikCentralDepartment::query()->find($accessLevels->first()?->hik_central_department_id)?->hik_central_department_id;
                $res = (new HikCentralService())->addWorkerToServer($photo->worker, $photoBase64, $data['to'] ?? null, $departmentId);

                if (!$res['status']) {
                    $photo->update(['error' => $res['msg'] ?? 'Error', 'status' => 4]);
                    continue;
                }

                $newPerson = WorkerHikCentral::query()->updateOrCreate([
                    'worker_id' => $photo->worker->id,
                    'hik_central_key' => 1,
                    'hik_central_person_id' => $res['personId'],
                ], [
                    'worker_photo_id' => $workerPhoto->id,
                    'to' => $data['to'] ?? now()->addYear(2),
                ]);

                $hikWorkerService->attachWorkersToAccessLevels($accessLevels, $res['personId'], $newPerson, 'attach');

                $photo->update([
                    'status' => 2,
                    'error' => null,
                    'hcp_person_id' => $res['personId'],
                ]);
                continue;
            }

            $res = (new HikCentralService())->updatePersonFace($photo->hcp_person_id, $photoBase64);
            if ((int)$res->code === 0) {
                $photo->update(['status' => 2, 'error' => null]);
                if (!empty($data['access_level_ids'])) {
                    $accessLevels = HikCentralAccessLevel::whereIn('id', $data['access_level_ids'])->get();
                    $newPerson = WorkerHikCentral::query()->where('hik_central_person_id', $photo->hcp_person_id)->first();
                    $newPerson?->update(['worker_photo_id' => $workerPhoto->id]);
                    if ($newPerson) {
                        $hikWorkerService->attachWorkersToAccessLevels($accessLevels, $photo->hcp_person_id, $newPerson, 'attach');
                    }
                }
                continue;
            }

            $photo->update(['error' => $res->msg ?? 'Error', 'status' => 4]);
        }
    }
}
