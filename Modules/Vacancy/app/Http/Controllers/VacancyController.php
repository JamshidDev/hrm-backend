<?php

namespace Modules\Vacancy\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Modules\HR\Models\VacancyApplication;
use Modules\HR\Models\VacancyPosition;
use Modules\Structure\Models\City;
use Modules\Structure\Models\Organization;
use Modules\Structure\Models\Region;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Structure\OnlyCityResource;
use Modules\Structure\Transformers\Structure\RegionMinimalResource;
use Modules\Vacancy\Transformers\VacanciesResource;
use Modules\Vacancy\Transformers\VacanciesShowResource;
use Modules\Vacancy\Transformers\VacancyApplicationResource;

class VacancyController extends Controller
{
    public function index(): JsonResponse
    {
        $data = VacancyPosition::query()
            ->with([
                'department_position',
                'department_position.department',
                'department_position.position',
                'organization',
            ])
            ->where('to', '>=', now()->subDay()->toDateString())
            ->whereHas('department_position')
            ->whereHas('department_position.department')
            ->whereHas('department_position.position')
            ->withCount('applications')
            ->when(request('organizations'), function ($query) {
                $query->whereIn('organization_id', [request('organizations')]);
            })
            ->when(request('education'), function ($query) {
                $query->where('education', request('education'));
            })
            ->when(request('region_id'), function ($query) {
                $query->whereHas('city', function ($query) {
                    $query->where('region_id', request('region_id'));
                });
            })
            ->when(request('city_id'), function ($query) {
                $query->where('city_id', request('city_id'));
            })
            ->when(request('experience'), function ($query) {
                $query->where('experience', request('experience'));
            })
            ->when(request('salary'), function ($query) {
                $query->where('salary', '>=', (int)request('salary'));
            })
            ->where('status', true)
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($data, VacanciesResource::class);

        return Helper::response(true, $data);
    }

    public function list(): JsonResponse
    {
        $vacancies = VacancyPosition::query()
            ->select([
                'id', 'organization_id', 'department_position_id', 'rate', 'city_id', 'salary', 'created_at'
            ])
            ->where('to', '>=', now()->subDay()->toDateString())
            ->whereHas('department_position')
            ->whereHas('department_position.department')
            ->with([
                'organization:id,name,name_ru,name_en,full_name',
                'department_position:id,department_id,position_id',
                'department_position.position:id,name',
                'department_position.department:id,name,level',
                'city:id,region_id,name',
                'city.region:id,name',
            ])
            ->where('status', true)
            ->get();

        $vacanciesCount = $vacancies->sum('rate');

        $lastVacancies = $vacancies->sortByDesc('created_at')->map(function ($item) {
            return [
                'id' => $item->id,
                'department' => ucfirst($item->department_position?->department?->name),
                'position' => ucfirst($item->department_position?->position?->name),
                'salary' => $item->salary,
                'salary_status' => $item->salary_status,
                'phd_status' => $item->phd_status,
                'rate' => $item->rate,
                'city' => $item->city?->name,
                'region' => $item->city?->region?->name,
            ];
        })->values();

        $groupedVacancies = $vacancies->groupBy('organization_id')->map(function ($items) {
            $organization = $items->first()->organization;
            return [
                'organization_id' => $organization->id,
                'organization_name' => $organization->name,
                'organization_full_name' => $organization->full_name,
                'vacancies_count' => $items->sum('rate')
            ];
        })->values();

        $groupedByRegions = $vacancies->filter(fn($item) => $item->city && $item->city->region)
            ->groupBy(fn($item) => $item->city->region->id)
            ->map(function ($items) {
                $region = $items->first()->city->region;
                return [
                    'region_id' => $region->id,
                    'region_name' => $region->name,
                    'vacancies_count' => $items->sum('rate')
                ];
            })->values();

        return Helper::response(true, [
            'vacanciesCount' => $vacanciesCount,
            'organizations' => $groupedVacancies,
            'regions' => $groupedByRegions,
            'lastVacancies' => $lastVacancies,
        ]);
    }

    public function show($id, Request $request): JsonResponse
    {
        $vacancy = VacancyPosition::query()
            ->with([
                'organization:id,name,name_ru,name_en,full_name',
                'department_position:id,department_id,position_id',
                'department_position.position:id,name',
                'department_position.department:id,name,level',
                'city:id,region_id,name',
                'city.region:id,name',
            ])->withCount('applications')->findOrFail($id);

        $ip = request()->ip();
        $browser = substr(request()->header('User-Agent'), 0, 100);
        $key = "vacancy_viewed_{$id}_{$ip}_{$browser}";
        if (!Cache::has($key)) {
            $vacancy->increment('view_count');
            Cache::put($key, true, now()->addHours(12));
        }

        $sendApplication = null;
        if ($request->user('vacancy')) {
            $sendApplication = VacancyApplication::query()
                ->where('vacancy_position_id', $id)
                ->where('vacancy_user_id', $request->user('vacancy')->id)
                ->with(['user'])
                ->first();
        }

        return Helper::response(true, [
            'vacancy' => new VacanciesShowResource($vacancy),
            'send' => $sendApplication ? new VacancyApplicationResource($sendApplication) : null,
        ]);
    }

    public function regions(): JsonResponse
    {
        $data = Region::query()->search()->get();

        $regions = RegionMinimalResource::collection($data);

        return Helper::response(true, $regions);
    }

    public function cities(): JsonResponse
    {
        $data = City::query()->search()->get();

        $cities = OnlyCityResource::collection($data);

        return Helper::response(true, $cities);
    }

    public function organizations(): JsonResponse
    {
        $orgIds = VacancyPosition::query()
            ->where('to', '>=', now()->subDay())
            ->where('status', true)
            ->select('organization_id');

        $organizations = Organization::query()->whereIn('id', $orgIds)->get();

        return Helper::response(true, OrganizationListResource::collection($organizations));
    }
}
