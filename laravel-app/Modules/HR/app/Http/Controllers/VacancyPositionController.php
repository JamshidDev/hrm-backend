<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\HR\DTO\VacancyPositionDTO;
use Modules\HR\Enums\EducationEnum;
use Modules\HR\Http\Requests\Vacancy\StoreVacancyPositionRequest;
use Modules\HR\Http\Requests\Vacancy\UpdateVacancyPositionRequest;
use Modules\HR\Models\DepartmentPosition;
use Modules\HR\Services\VacancyPositionService;
use Modules\HR\Transformers\Vacancy\VacanciesEditResource;
use Modules\HR\Transformers\Vacancy\VacanciesResource;
use Modules\HR\Transformers\Vacancy\VacanciesShowResource;
use Modules\Structure\Transformers\Structure\CityResource;

class VacancyPositionController extends Controller
{
    public function __construct(
        protected VacancyPositionService $service
    )
    {
    }

    public function index(): JsonResponse
    {
        $user = auth()->user();
        $data = $this->service->index(request('per_page', 10), $user);

        return Helper::response(true, PaginateResource::make($data, VacanciesResource::class));
    }

    public function show(int $id): JsonResponse
    {
        return Helper::response(true, new VacanciesShowResource($this->service->show($id)));
    }

    public function edit(int $id): JsonResponse
    {
        return Helper::response(true, new VacanciesEditResource($this->service->edit($id)));
    }

    public function store(StoreVacancyPositionRequest $request): JsonResponse
    {
        $this->service->store(VacancyPositionDTO::fromRequest($request->validated()));

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(UpdateVacancyPositionRequest $request, int $id): JsonResponse
    {
        $this->service->update($id, $request->validated());

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy(int $id): JsonResponse
    {
        $this->service->delete($id);

        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function vacancies(Request $request): JsonResponse
    {
        $user = $request->user()->load('organization.city.region');

        $positions = DepartmentPosition::query()
            ->where('organization_id', $user->organization_id)
            ->select(
                'id',
                'organization_id',
                'position_id',
                'rate',
                'department_id',
                'salary',
                'education',
                'experience'
            )
            ->withSum('worker_positions as worker_rate', 'rate')
            ->with(['department', 'position'])
            ->whereRaw('COALESCE(rate, 0) > COALESCE((
                select sum(worker_positions.rate)
                from worker_positions
                where department_positions.id = worker_positions.department_position_id
                  and status = 2
                  and worker_positions.deleted_at is null
            ), 0)')
            ->get()
            ->map(fn($item) => [
                'id' => $item->id,
                'rate' => $item->rate,
                'worker_rate' => ((int)$item->worker_rate) / 100,
                'department' => $item->department->name,
                'position' => $item->position->name,
                'salary' => $item->salary,
                'education' => [
                    'id' => $item->education,
                    'name' => EducationEnum::get($item->education),
                ],
                'experience' => (int)($item->experience / 12),
            ]);

        return Helper::response(true, [
            'positions' => $positions,
            'city' => new CityResource($user->organization->city),
        ]);
    }

    public function changeStatus(int $id): JsonResponse
    {
        $this->service->changeStatus($id);
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function finish(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'finish' => 'required|in:1,2',
        ]);
        $this->service->finish($id, $request);

        return Helper::response(trans('messages.successfully_updated'));
    }
}
