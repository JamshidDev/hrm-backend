<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Confirmation\Enums\ApplicationEducationTypeEnum;
use Modules\HR\Enums\WorkerApplicationTypeEnum;
use Modules\HR\Http\Requests\WorkerApplication\ApplicationConfirmationRequest;
use Modules\HR\Http\Requests\WorkerApplication\GenerateWorkerApplicationUrlRequest;
use Modules\HR\Http\Requests\WorkerApplication\StoreWorkerApplicationRequest;
use Modules\HR\Models\WorkerApplication;
use Modules\HR\Services\WorkerApplicationService;
use Modules\HR\Transformers\ConfirmationWorker\ConfirmationWorkerResource;
use Modules\HR\Transformers\WorkerApplication\WorkerApplicationResource;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionMinimalResource;

class WorkerApplicationController extends Controller
{
    public function __construct(
        private readonly WorkerApplicationService $service
    )
    {
    }

    public function index(): JsonResponse
    {
        $data = WorkerApplication::query()
            ->organizationFilter(auth()->user(), request()->all())
            ->whereNotNull('worker_id')
            ->with(['organization', 'worker'])
            ->orderByDesc('id')
            ->paginate(request('per_page', 10));

        return Helper::response(true,
            PaginateResource::make($data, WorkerApplicationResource::class)
        );
    }

    public function edit(int $id): JsonResponse
    {
        $json = $this->service->getStoredJson($id);

        return Helper::response(true, $json);
    }

    public function store(StoreWorkerApplicationRequest $request): JsonResponse
    {
        $this->service->create(
            $request->toDto(),
            auth()->user()
        );

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(StoreWorkerApplicationRequest $request, $workerApplicationId): JsonResponse
    {
        $workerApplication = WorkerApplication::findOrFail($workerApplicationId);
        $this->service->update(
            $workerApplication,
            $request->toDto(),
            auth()->user()
        );

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($workerApplicationId): JsonResponse
    {
        $workerApplication = WorkerApplication::findOrFail($workerApplicationId);
        $this->service->delete($workerApplication);

        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function accept(Request $request, $workerApplicationId): JsonResponse
    {
        $workerApplication = WorkerApplication::findOrFail($workerApplicationId);
        $this->service->accept(
            $workerApplication,
            $request->boolean('status'),
            $request->comment,
            auth()->user()
        );

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function confirmations(Request $request): JsonResponse
    {
        $positions = $this->service->availableConfirmations(
            $request->director_id,
            auth()->user(),
            request('per_page', 50)
        );

        return Helper::response(
            true,
            PaginateResource::make($positions, WorkerPositionMinimalResource::class)
        );
    }

    public function enums(): JsonResponse
    {
        return Helper::response(true, [
            'application_types' => WorkerApplicationTypeEnum::list(),
            'education_types' => ApplicationEducationTypeEnum::list(),
        ]);
    }

    public function positions(): JsonResponse
    {
        $positions = $this->service->myPositions(auth()->user());
        return Helper::response(true, $positions);
    }

    public function directors(): JsonResponse
    {
        $user = auth()->user();
        $organizationId = request('organization_id');
        if (!$organizationId) {
            $organizationId = request('organizations');
        }
        if (!$organizationId) {
            $organizationId = $user->organization_id;
        }
        $directors = $this->service->directors($organizationId);

        return Helper::response(true, ConfirmationWorkerResource::collection($directors));
    }

    public function getApplicationUrl(GenerateWorkerApplicationUrlRequest $request): JsonResponse
    {
        $url = $this->service->generateSignedUrl($request->toDto());

        return Helper::response(true, ['url' => $url]);
    }

    public function applicationConfirmation(ApplicationConfirmationRequest $request): JsonResponse
    {
        $result = $this->service->confirmBySignature($request);

        return Helper::response(trans('messages.successfully_stored'), $result);
    }

    public function temporarily_workers(Request $request): JsonResponse
    {
        $data = $this->service->temporaryWorkers(
            $request,
            request('per_page', 50)
        );

        return Helper::response(true, $data);
    }

}
