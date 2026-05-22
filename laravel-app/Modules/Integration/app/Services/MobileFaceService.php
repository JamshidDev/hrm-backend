<?php

namespace Modules\Integration\Services;

use App\Helpers\Helper;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\Worker;
use Modules\Integration\Exceptions\IntegrationServiceException;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;
use Modules\Turnstile\Models\TerminalEvent;
use Modules\Turnstile\Models\TurnstileWorkerSchedule;

class MobileFaceService
{
    public function __construct(
        public IntegrationService $service
    )
    {
    }

    public function sendEvent($data, $newEvent): JsonResponse
    {
        $worker = Worker::query()->wherePin($data['pin'])->with('position')->first();
        if (!$worker) {
            throw IntegrationServiceException::notFound(trans('messages.not_found'));
        }
        try {
            $event = [
                'worker_id' => (int)$worker->id,
                'hik_central_access_level_id' => null,
                'worker_position_id' => $worker->position?->id,
                'event_date_and_time' => $data['event_date_and_time'],
                'auth_type' => 'MobileFaceEvent',
                'device_name' => $data['organization'],
                'resource_name' => $data['organization'],
                'last_name' => $worker->last_name,
                'first_name' => $worker->first_name,
                'middle_name' => $worker->middle_name,
                'direction' => $data['event_type'] ?? false,
                'temperature' => null,
                'mask_status' => null
            ];

            if (TerminalEvent::query()
                    ->where('worker_id', $worker->id)
                    ->where('event_date_and_time', $data['event_date_and_time'])
                    ->exists()) {
                throw IntegrationServiceException::eventAlreadyExists(trans('messages.turnstile.event_already_exists'));
            }

            $terminalEvent = TerminalEvent::create($event);
            $newEvent->update([
                'terminal_event_id' => $terminalEvent?->id,
                'worker_position_id' => $worker->position?->id,
                'worker_id' => $worker->id
            ]);
            return Helper::response();
        } catch (IntegrationServiceException $e) {
            throw $e;
        } catch (Exception $e) {
            Helper::setLog($e, 'MobileFace Send Event Error');
            throw IntegrationServiceException::serverError(trans('messages.server_error'));
        }
    }

    public function checkWorker($data): JsonResponse
    {
        try {
            $worker = Worker::query()
                ->where('pin', $data['pin'])
                ->with([
                    'photos',
                    'phones',
                    'positions.organization:id,name,name_en,name_ru,group,full_name,parent_id',
                    'positions.organization.parent:id,name,name_en,name_ru,group,full_name,parent_id',
                    'positions.department:id,name,level',
                    'positions.position:id,name'
                ])
                ->first();

            if (!$worker) {
                return Helper::response();
            }

            if (!$worker->position) {
                return Helper::response();
            }

            $data = [
                'id' => $worker->id,
                'last_name' => $worker->last_name,
                'first_name' => $worker->first_name,
                'middle_name' => $worker->middle_name,
                'birthday' => $worker->birthday,
                'pin' => $worker->pin,
                'sex' => $worker->sex ? 'male' : 'female',
                'photos' => $worker->photos->map(fn($photo) => [
                    'photo' => Helper::fileUrl($photo->photo),
                    'current' => $photo->current,
                ]),
                'phones' => $worker->phones->map(fn($phone) => $phone->phone),
                'positions' => $worker->positions->map(fn($position) => [
                    'id' => $position->id,
                    'organization' => $position->organization ? [
                        'id' => $position->organization->id,
                        'name' => $position->organization->name,
                        'parent' => $position->organization->parent
                            ? new OrganizationListResource($position->organization->parent)
                            : null
                    ] : null,
                    'department' => new DepartmentListResource($position->department),
                    'position' => new PositionMinimalResource($position->position)
                ])
            ];

            return Helper::response(true, $data);
        } catch (Exception $e) {
            Helper::setLog($e, 'MobileFace Check Worker Error');
            throw IntegrationServiceException::serverError(trans('messages.server_error'));
        }
    }

    public function schedules($data): JsonResponse
    {
        $date = Carbon::parse("{$data['year']}-{$data['month']}-01");
        $startDate = $date->startOfMonth()->toDateString();
        $endDate = $date->endOfMonth()->toDateString();
        $workerId = Worker::query()->wherePin($data['pin'])->value('id');
        $data = TurnstileWorkerSchedule::query()
            ->where('worker_id', $workerId)
            ->whereHas('worker_position', fn($query) => $query->where('status', PositionStatusEnum::ACTIVE->value))
            ->whereBetween('date', [$startDate, $endDate])
            ->orderBy('date')
            ->get()
            ->map(fn($schedule) => [
                'date' => $schedule->date,
                'start_time' => $schedule->start_time,
                'end_time' => $schedule->end_time,
                'is_work' => $schedule->work_status
            ]);

        return Helper::response(true, $data);
    }

}
