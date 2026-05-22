<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\HR\Models\WorkerBusinessTrip;
use Modules\HR\Transformers\BusinessTrip\BusinessTripResource;

class WorkerBusinessTripController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);
        $trips = WorkerBusinessTrip::query()
            ->filter(request()->all())
            ->search()
            ->with([
                'organization',
                'worker_position.department',
                'worker_position.position',
                'worker_position.worker:id,first_name,last_name,middle_name,photo',
            ])
            ->orderByDesc('id')
            ->paginate($per_page);

        $data = PaginateResource::make($trips, BusinessTripResource::class);
        return Helper::response(true, $data);
    }
}
