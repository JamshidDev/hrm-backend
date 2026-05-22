<?php

namespace Modules\Turnstile\Services;

use App\Helpers\Helper;
use App\Helpers\TurnStileHelper;
use App\Http\Resources\PaginateResource;
use App\Jobs\HCP\AttachWorkersToAccessLevelHCPJob;
use App\Services\HikCentralService;
use App\Traits\Base64FileUploadTrait;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\Worker;
use Modules\Turnstile\Enums\HCPErrorCodesEnum;
use Modules\Turnstile\Exceptions\TurnstileServiceException;
use Modules\Turnstile\Models\HCPDevice;
use Modules\Turnstile\Models\HikCentralAccessLevel;
use Modules\Turnstile\Models\HikCentralDepartment;
use Modules\Turnstile\Models\WorkerAccessLevel;
use Modules\Turnstile\Models\WorkerHikCentral;
use Modules\Turnstile\Transformers\HCPWorkersResource;
use Modules\Turnstile\Transformers\WorkerAccessLevelResource;
use RuntimeException;

class HikCentralWorkerService
{
    use Base64FileUploadTrait;

    public function index(): JsonResponse
    {
        $user = auth()->user();
        $search = request('search');
        $accessLevelId = request('access_level_id');
        $status = request('status');
        $added = request('added');
        $organizations = request('organizations');
        $departments = request('departments');

        $query = Worker::query()
            ->select('workers.id', 'first_name', 'last_name', 'middle_name', 'photo','card')
            ->when($accessLevelId || $status || $added === 'yes', function ($query) use ($accessLevelId, $status) {
                $query->join('worker_access_levels as wal', 'wal.worker_id', '=', 'workers.id');

                $conditions = [];
                if ($accessLevelId) {
                    $conditions[] = ['wal.hik_central_access_level_id', '=', $accessLevelId];
                }
                if ($status) {
                    $conditions[] = ['wal.status', '=', $status];
                }

                if (!empty($conditions)) {
                    $query->where($conditions);
                }

                $query->distinct('workers.id');
            })
            ->when($organizations || $departments || !$accessLevelId, function ($query) use ($user, $departments) {
                $query->whereHas('position', function ($query) use ($user, $departments) {
                    $query->where('status', PositionStatusEnum::ACTIVE->value)
                        ->filter($user, request()->all())
                        ->when($departments, function ($query) use ($departments) {
                            $query->whereIn('department_id', explode(',', $departments));
                        });
                });
            })
            ->when($search, function ($query) {
                $query->searchByFullName();
            })
            ->when($added === 'no', function ($query) {
                $query->whereDoesntHave('access_levels');
            })
            ->with([
                'hcpPerson:id,worker_id,hik_central_person_id,to,updated_at,worker_photo_id',
                'hcpPerson.access_levels'  => function ($q) {
                    $q->select('id', 'hik_central_access_level_id', 'worker_id', 'status','worker_hik_central_id')
                        ->orderByDesc('status')
                        ->limit(4);
                },
                'position' => function ($query) use ($user) {
                    $query->select('id', 'worker_id', 'organization_id', 'department_id', 'position_id', 'status')
                        ->where('status', PositionStatusEnum::ACTIVE->value)
                        ->filter($user, request()->all())
                        ->with([
                            'department:id,name,level',
                            'position:id,name',
                            'organization:id,name,name_ru,name_en,group'
                        ]);
                },
            ])
            ->orderBy('workers.id'); // Order by qo'shish performancega yordam beradi

        $data = $query->paginate(request('per_page', 10));

        $data = PaginateResource::make($data, HCPWorkersResource::class);

        return Helper::response(true, $data);
    }

    public function showAccessLevels(Request $request): JsonResponse
    {
        $accessLevels = WorkerAccessLevel::query()
            ->where('worker_id', $request->worker_id)
            ->orderByDesc('status')
            ->get();

        return Helper::response(true, WorkerAccessLevelResource::collection($accessLevels));
    }

    public function showErrorAL(Request $request): JsonResponse
    {
        if ($request->access_level_id) {
            $al = WorkerAccessLevel::query()
                ->find($request->access_level_id);

            $errors = [];
            if ($al->errors) {
                $ers = json_decode($al->errors, false, 512, JSON_THROW_ON_ERROR);
                foreach ($ers as $er) {
                    $errors[] = [
                        'device_id' => $er->device_id,
                        'code' => HCPErrorCodesEnum::get((int)$er->code),
                        'time' => $er->time,
                        'name' => $er->name,
                    ];
                }
            }

            return Helper::response(true, $errors);
        }

        if ($request->worker_id) {
            $items = WorkerAccessLevel::query()
                ->where('worker_id', $request->worker_id)
                ->whereNotNull('errors')
                ->pluck('errors')
                ->flatten()
                ->toArray();

            $errors = [];
            foreach ($items as $item) {
                $ers = json_decode($item, false, 512, JSON_THROW_ON_ERROR);
                foreach ($ers as $er) {
                    $errors[] = [
                        'device_id' => $er->device_id,
                        'code' => HCPErrorCodesEnum::get((int)$er->code),
                        'time' => $er->time,
                        'name' => $er->name,
                    ];
                }
            }

            return Helper::response(true, $errors);
        }
        return Helper::response();
    }

    public function addWorkerToHikCentral(Request $request): ?JsonResponse
    {
        set_time_limit(300);
        $request->validate([
            'worker_id'       => 'required|integer',
            'access_level_ids' => 'required|array'
        ]);

        if (count($request->access_level_ids) > 5 && auth()->id() !== 1) {
            return Helper::response(trans('messages.turnstile.max_access_level_5'), [], 400);
        }

        $to = $request->to ?? now()->addYear(2);

        try {
            $worker = Worker::find($request->worker_id);

            if (!$request->photo_id && !$request->photo) {
                return Helper::response(trans('messages.missing_photo'), [], 400);
            }

            $accessLevels = HikCentralAccessLevel::whereIn('id', $request->access_level_ids)->get();
            $checkDevice = $this->checkStatusDevices($accessLevels->pluck('devices')->flatten()->toArray());
            if (!$checkDevice['status'] && auth()->id() !== 1) {
                return Helper::response($checkDevice['msg'], [], 400);
            }
            if (!count($accessLevels)) {
                return Helper::response(trans('messages.not_found'), [], 400);
            }

            $convertPhoto = new TurnStileHelper()->convertImage($worker, $request->photo, $request->photo_id);

            $newPerson = WorkerHikCentral::query()->where('worker_id', $worker->id)->first();
            if (!$newPerson) {
                $department = HikCentralDepartment::query()->find($accessLevels->first()->hik_central_department_id);

                $res = new HikCentralService()
                    ->addWorkerToServer(
                        $worker,
                        $convertPhoto['base64'],
                        $to,
                        (string)$department?->hik_central_department_id
                    );

                if (!$res['status']) {
                    return Helper::response($res['msg'], [], 400);
                }
                $newPersonId = $res['personId'];
                $newPerson = WorkerHikCentral::query()
                    ->updateOrCreate([
                        'worker_id' => $worker->id,
                        'hik_central_key' => 1,
                        'hik_central_person_id' => $newPersonId,
                    ], [
                        'to' => $to->toDateTimeString(),
                        'worker_photo_id' => $convertPhoto['photo_id'] ?? null,
                    ]);
            } else {
                $newPersonId = (string)$newPerson->hik_central_person_id;
                if ($newPerson->worker_photo_id !== $convertPhoto['photo_id']) {
                    $res = new HikCentralService()->updatePersonFace($newPersonId, $convertPhoto['base64']);
                    if ((int)$res->code === 0) {
                        $newPerson->update([
                            'worker_photo_id' => $convertPhoto['photo_id'] ?? null,
                            'to' => $to->toDateTimeString()
                        ]);
                    } else {
                        return Helper::response($res->msg, [], 400);
                    }
                }
            }

            WorkerAccessLevel::withTrashed()
                ->where('worker_id', $newPerson->worker_id)
                ->whereNotNull('deleted_at')
                ->forceDelete();

            if (count($request->access_level_ids) > 5) {
                AttachWorkersToAccessLevelHCPJob::dispatch($accessLevels, $newPersonId, $newPerson);
            } else {
                $this->attachWorkersToAccessLevels(
                    $accessLevels,
                    $newPersonId,
                    $newPerson,
                    'attach');
            }

            return Helper::response(trans('messages.successfully_stored'));
        } catch (RuntimeException $e) {
            throw TurnstileServiceException::serverError($e->getMessage());
        } catch (Exception $e) {
            Helper::setLog($e, 'Turnstile add worker');
            throw TurnstileServiceException::serverError(trans('messages.server_error'));
        }
    }

    public function attachWorkersToAccessLevels($accessLevels, $newPersonId, $newPerson, $status, $sleep = false): void
    {
        foreach ($accessLevels as $accessLevel) {
            if ($sleep) {
                sleep(1);
            }
            if ($status === 'detach') {
                new HikCentralService()->detachWorkerFromAccessLevel([$newPersonId], $accessLevel?->hik_central_access_level_id);
                sleep(10);
            }
            $res = new HikCentralService()->attachWorkerToAccessLevel([$newPersonId], $accessLevel?->hik_central_access_level_id);
            if ($res['status']) {
                WorkerAccessLevel::query()
                    ->updateOrCreate(
                        [
                            'worker_id' => $newPerson->worker_id,
                            'hik_central_access_level_id' => $accessLevel->id,
                        ],
                        [
                            'worker_hik_central_id' => $newPerson->id,
                            'hik_central_key' => 1,
                            'hik_central_person_id' => $newPersonId,
                            'status' => 1,
                        ]
                    );

            } else {
                WorkerAccessLevel::query()
                    ->where('worker_id', $newPerson->worker_id)
                    ->where('hik_central_access_level_id', $accessLevel->id)
                    ->forceDelete();
            }
        }
    }

    public function updateWorkerFace(Request $request): JsonResponse
    {
        set_time_limit(55);
        $request->validate([
            'id' => 'sometimes|required|integer',
            'worker_id' => 'sometimes|required|integer',
        ]);

        try {
            if (!$request->photo_id && !$request->photo) {
                return Helper::response(trans('messages.missing_photo'), [], 400);
            }

            $user = auth()->user();

            if ($request->id && !$request->worker_id) {
                $hikWorker = WorkerHikCentral::query()
                    ->with(['worker','access_levels'])
                    ->find($request->id);
                if (!$hikWorker) {
                    return Helper::response(trans('messages.user_not_found'), [], 400);
                }
                if ($hikWorker->worker_photo_id !== $request->photo_id) {
                    $res = $this->updateWorkerFaceHCP($request, $hikWorker);
                    if (!$res['status']) {
                        return Helper::response($res['msg'], [], 400);
                    }
                }
                if ($request->to !== Carbon::parse($hikWorker->to)->format('Y-m-d')) {
                    $res = new HikCentralService()->editWorkerFromHCP($hikWorker, $request->to);
                    if (!$res['status']) {
                        return Helper::response($res['msg'], [], 400);
                    }
                }

            } else if (
                !$request->id &&
                $request->worker_id &&
                !WorkerHikCentral::query()->where('worker_id', $request->worker_id)->exists()) {
                $accessLevels = HikCentralAccessLevel::whereIn('id', $request->access_level_ids)->get();
                $department = HikCentralDepartment::query()->find($accessLevels->first()->hik_central_department_id);
                $addWorker = $this->addWorkerToHCP($request, $user, $department?->hik_central_department_id);
                if (!$addWorker['status']) {
                    return Helper::response($addWorker['msg'], [], 400);
                }
                $hikWorker = $addWorker['newPerson'];
            } else {
                return Helper::response(trans('messages.not_found'), [], 400);
            }

            WorkerAccessLevel::withTrashed()
                ->where('worker_id', $hikWorker->worker_id)
                ->whereNotNull('deleted_at')
                ->forceDelete();

            $workerAccessLevels = WorkerAccessLevel::where('worker_id', $hikWorker->worker_id)->get();
            $diffAC = array_diff($request->access_level_ids, $workerAccessLevels->pluck('hik_central_access_level_id')->toArray());

            if (count($diffAC) > 5 && auth()->id() !== 1) {
                return Helper::response(trans('messages.turnstile.max_access_level_5'), [], 400);
            }
            if (count($diffAC) === 0) {
                $diffAC = array_diff($workerAccessLevels->pluck('hik_central_access_level_id')->toArray(), $request->access_level_ids);
                if (count($diffAC) > 0) {
                    if (count($diffAC) > 5) {
                        return Helper::response(trans('messages.turnstile.max_access_level_5'), [], 400);
                    }
                    $accessLevels = HikCentralAccessLevel::whereIn('id', $diffAC)->get();

                    $checkDevice = $this->checkStatusDevices($accessLevels->pluck('devices')->flatten()->toArray());
                    if (!$checkDevice['status']) {
                        return Helper::response($checkDevice['msg'], [], 400);
                    }

                    $detachIds = [];
                    foreach ($accessLevels as $accessLevel) {
                        $detach = new HikCentralService()->detachWorkerFromAccessLevel([$hikWorker->hik_central_person_id], $accessLevel->hik_central_access_level_id);
                        if (!$detach['status']) {
                            continue;
                        }
                        $detachIds[] = $accessLevel->id;
                    }
                    WorkerAccessLevel::query()
                        ->where('worker_id', $hikWorker->worker_id)
                        ->whereIn('hik_central_access_level_id', $detachIds)
                        ->forceDelete();
                }
                return Helper::response(trans('messages.successfully_updated'));
            }
            $accessLevels = HikCentralAccessLevel::whereIn('id', $diffAC)->get();
            $checkDevice = $this->checkStatusDevices($accessLevels->pluck('devices')->flatten()->toArray());
            if (!$checkDevice['status'] && auth()->id() !== 1) {
                return Helper::response($checkDevice['msg'], [], 400);
            }
            if (count($diffAC) > 5) {
                AttachWorkersToAccessLevelHCPJob::dispatch($accessLevels, $hikWorker->hik_central_person_id, $hikWorker);
            } else {
                $this->attachWorkersToAccessLevels(
                    $accessLevels,
                    $hikWorker->hik_central_person_id,
                    $hikWorker,
                    'attach'
                );
            }
            return Helper::response(trans('messages.successfully_updated'));
        } catch (RuntimeException $e) {
            throw TurnstileServiceException::serverError($e->getMessage());
        } catch (Exception $e) {
            Helper::setLog($e, 'Turnstile update worker');
            throw TurnstileServiceException::serverError(trans('messages.server_error'));
        }
    }

    public function updateWorkerFaceHCP($request, $hikWorker): array
    {
        $worker = $hikWorker->worker;
        $convertPhoto = new TurnStileHelper()->convertImage($worker, $request->photo, $request->photo_id);

        $res = new HikCentralService()->updatePersonFace($hikWorker->hik_central_person_id, $convertPhoto['base64']);

        if ((int)$res->code === 0) {
            $hikWorker->update([
                'worker_photo_id' => $convertPhoto['photo_id'],
                'to' => $request->to ?? now()->addYear(2)->toDateTimeString(),
            ]);
            $hikWorker->access_levels()->update(['status' => 1]);
            return ['status' => true];
        }
        return ['status' => false, 'msg' => $res->msg];
    }

    public function checkStatusDevices($deviceIds): array
    {
        if (HCPDevice::query()
            ->whereIn('device_id', $deviceIds)
            ->where('status', false)
            ->exists()) {
            return [
                'status' => false,
                'msg' => trans('messages.turnstile.device_not_active'),
            ];
        }
        return ['status' => true, 'msg' => ''];
    }

    public function addWorkerToHCP($request, $user, $departmentId): array
    {
        if (!$request->photo_id && !$request->photo) {
            return [
                'status' => false,
                'msg' => trans('messages.missing_photo'),
            ];
        }
        $worker = Worker::find($request->worker_id);
        $convertPhoto = new TurnStileHelper()->convertImage($worker, $request->photo, $request->photo_id);
        $res = new HikCentralService()
            ->addWorkerToServer(
                $worker,
                $convertPhoto['base64'],
                $request->to,
                (string)$departmentId
            );

        if (!$res['status']) {
            return [
                'status' => false,
                'msg' => $res['msg'],
            ];
        }
        $newPersonId = $res['personId'];
        $newPerson = WorkerHikCentral::query()
            ->updateOrCreate([
                'worker_id' => $worker->id,
                'hik_central_key' => 1,
                'hik_central_person_id' => $newPersonId,
            ], [
                'worker_photo_id' => $convertPhoto['photo_id'] ?? null,
                'to' => $request->to ?? now()->addYear(2)->toDateTimeString(),
            ]);

        return [
            'status' => true,
            'newPerson' => $newPerson,
        ];
    }

    public function refreshAccessLevel(Request $request): JsonResponse
    {
        $request->validate(['access_level_id' => 'required']);

        $al = WorkerAccessLevel::query()->with('access_level')->find($request->access_level_id);
        if (!$al) {
            return Helper::response(trans('messages.not_found'), [], 400);
        }
        if ($al->access_level?->devices) {
            $checkDevice = $this->checkStatusDevices($al->access_level?->devices);
            if (!$checkDevice['status']) {
                return Helper::response($checkDevice['msg'], [], 400);
            }
        }

        $alId = $al->access_level?->hik_central_access_level_id;
        $personId = $al->hik_central_person_id;

        $detachWorkerRequest = new HikCentralService()->detachWorkerFromAccessLevel([$personId], $alId);
        if (!$detachWorkerRequest['status']) {
            return Helper::response($detachWorkerRequest['msg'], [], 400);
        }
        sleep(10);
        $res = new HikCentralService()->attachWorkerToAccessLevel([$personId], $alId);
        if (!$res['status']) {
            return Helper::response($res['msg'], [], 400);
        }
        $al->update(['status' => 1]);
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($workerId): JsonResponse
    {
        $als = WorkerAccessLevel::query()->where('worker_id', $workerId)->get();

        foreach ($als as $al) {
            $delete = new HikCentralService()->detachWorkerFromAccessLevel([$al->hik_central_person_id], $al->hik_central_access_level_id);
            if ($delete['status']) {
                $al->delete();
            }
            $al->delete();
        }

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
