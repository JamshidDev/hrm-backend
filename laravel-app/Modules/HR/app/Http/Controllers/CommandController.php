<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Http\JsonResponse;
use Modules\HR\DTO\CommandData;
use Modules\HR\Http\Requests\Command\CheckWorkerPositionAdditionalRequest;
use Modules\HR\Http\Requests\Command\StoreCommandRequest;
use Modules\HR\Models\Command;
use Modules\HR\Services\CommandService;
use Modules\HR\Transformers\Command\CommandResource;

class CommandController extends Controller
{
    use Base64FileUploadTrait;

    public function __construct(
        private readonly CommandService $service
    )
    {
    }

    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);
        $user = auth()->user();

        $commands = Command::query()
            ->search()
            ->filter($user, request()->all())
            ->with([
                'organization:id,name,name_en,name_ru,group',
                'confirmations.worker:id,last_name,first_name,middle_name,birthday,photo',
            ])
            ->when(request('confirmation'), fn($q) => $q->where('confirmation', request('confirmation')))
            ->orderByDesc('id')
            ->paginate($per_page);

        $commands = PaginateResource::make($commands, CommandResource::class);

        return Helper::response(true, $commands);
    }


    public function store(StoreCommandRequest $request)
    {
        $user = auth()->user()->load('organization.city.region');
        $dto = CommandData::fromArray($request->validatedData());

        $file = $this->service->store($dto, $user);

        if ($dto->status === 'view') {
            return response()->download('storage/' . $file)->deleteFileAfterSend();
        }

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function destroy($commandId): JsonResponse
    {
        $this->service->delete($commandId);
        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function checkWorkerPositionAdditional($workerPositionId, CheckWorkerPositionAdditionalRequest $request): JsonResponse
    {
        $type = $request->type;
        $data = $this->service->checkWorkerPositionAdditional($type, $workerPositionId);
        return Helper::response(true, [
            'type' => $type,
            'data' => $data,
        ]);
    }
}
