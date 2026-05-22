<?php

namespace Modules\Confirmation\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Models\WorkerApplicationConfirmation;
use Modules\Confirmation\Transformers\ApplicationConfirmationResource;

class WorkerApplicationConfirmationController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = WorkerApplicationConfirmation::query()
            ->where('worker_id', auth()->user()->worker_id)
            ->with([
                'worker_application.worker:id,first_name,last_name,middle_name,birthday,photo',
                'worker_application.organization:id,name,name_en,name_ru,group',
            ])
            ->whereHas('worker_application', function ($query) {
                $query->where('confirmation', '!=', ConfirmationStatusEnum::SUCCESS->value);
            })
            ->orderByDesc('id')
            ->paginate($per_page);

        $data = PaginateResource::make($data, ApplicationConfirmationResource::class);

        return Helper::response(true, $data);
    }

}
