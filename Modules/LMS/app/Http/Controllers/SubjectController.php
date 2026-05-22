<?php

namespace Modules\LMS\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\LMS\Models\Subject;
use Modules\LMS\Transformers\SubjectListResource;

class SubjectController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = Subject::query()->search()->paginate($per_page);

        $data = PaginateResource::make($data, SubjectListResource::class);

        return Helper::response(true, $data);
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required']);

        Subject::create($request->all());

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, Subject $subject): JsonResponse
    {
        $request->validate(['name' => 'required']);

        $subject->update($request->all());

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(Subject $subject): JsonResponse
    {
        $subject->delete();

        return Helper::response(true, trans('messages.successfully_deleted'));
    }
}
