<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\HR\Models\VacancyApplication;
use Modules\Vacancy\Transformers\VacancyApplicationResource;

class VacancySendController extends Controller
{
    public function index($vacancyPositionId): JsonResponse
    {
        $applications = VacancyApplication::query()
            ->where('vacancy_position_id', $vacancyPositionId)
            ->with([
                'user',
                'user.careers',
                'user.educations',
                'user.nationality',
                'user.country',
                'user.region',
                'user.city',
                'user.current_region',
                'user.current_city',
                'files'
            ])
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($applications, VacancyApplicationResource::class);

        return Helper::response(true, $data);
    }
}
