<?php

namespace Modules\Structure\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\Structure\Models\Language;
use Modules\Structure\Transformers\Structure\LanguageResource;

class LanguageController implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:languages-write', only: ['store', 'update', 'destroy']),
        ];
    }
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = Language::query()->search()->paginate($per_page);

        $languages = PaginateResource::make($data, LanguageResource::class);

        return Helper::response(true, $languages);
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required',
            'name_ru' => 'required',
            'name_en' => 'required',
        ]);
        $data = $request->all();
        $data['id'] = Language::query()->max('id') + 1;
        Language::query()->create($data);

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, Language $language): JsonResponse
    {
        $request->validate([
            'name' => 'required',
            'name_ru' => 'required',
            'name_en' => 'required',
        ]);

        $language->update($request->all());

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(Language $language): JsonResponse
    {
        $language->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
