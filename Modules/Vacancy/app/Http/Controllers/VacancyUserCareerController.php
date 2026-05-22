<?php

namespace Modules\Vacancy\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Vacancy\Models\VacancyUserCareer;
use Modules\Vacancy\Transformers\VacancyUserCareerResource;

class VacancyUserCareerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = VacancyUserCareer::query()
            ->where('vacancy_user_id', $request->user('vacancy')->id)
            ->get();
        return Helper::response(true, VacancyUserCareerResource::collection($data));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'from' => 'required',
            'position' => 'required',
        ]);

        $data = $request->all();
        $data['vacancy_user_id'] = $request->user('vacancy')->id;
        VacancyUserCareer::create($data);

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, $vacancyUserCareerId): JsonResponse
    {
        $validated = $request->validate([
            'from' => 'sometimes|required',
            'to' => 'sometimes',
            'position' => 'sometimes|required',
        ]);

        VacancyUserCareer::query()->findOrFail($vacancyUserCareerId)->update($validated);

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy($vacancyUserCareerId): JsonResponse
    {
        VacancyUserCareer::query()->findOrFail($vacancyUserCareerId)->delete();

        return Helper::response(true, trans('messages.successfully_deleted'));
    }
}
