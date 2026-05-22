<?php

namespace Modules\Vacancy\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Vacancy\Models\VacancyUserEducation;
use Modules\Vacancy\Transformers\VacancyUserEducationResource;

class VacancyUserEducationController extends Controller
{

    public function index(Request $request): JsonResponse
    {
        $data = VacancyUserEducation::query()
            ->where('vacancy_user_id', $request->user('vacancy')->id)
            ->get();
        return Helper::response(true, VacancyUserEducationResource::collection($data));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => 'required|date',
            'university' => 'required|string',
            'to' => 'nullable|date',
        ]);

        $data['vacancy_user_id'] = $request->user('vacancy')->id;
        VacancyUserEducation::create($data);

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, $vacancyUserEducationId): JsonResponse
    {
        $validated = $request->validate([
            'from' => 'sometimes|required',
            'to' => 'sometimes|required',
            'university' => 'sometimes|required',
        ]);

        VacancyUserEducation::query()->findOrFail($vacancyUserEducationId)->update($validated);

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy($vacancyUserEducationId): JsonResponse
    {
        VacancyUserEducation::query()->findOrFail($vacancyUserEducationId)->delete();

        return Helper::response(true, trans('messages.successfully_deleted'));
    }

}
