<?php

namespace Modules\Chat\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\Chat\Http\Requests\ChatNews\ChatNewsCategoryStoreRequest;
use Modules\Chat\Models\ChatNewsCategory;
use Modules\Chat\Services\ChatNewsCategoryService;
use Modules\Chat\Transformers\Chat\ChatNewsCategoryResource;

class ChatNewsCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = ChatNewsCategory::paginate(\request('per_page') ?? 10);
        $data = PaginateResource::make($categories, ChatNewsCategoryResource::class);
        return Helper::response(true, $data);
    }

    public function store(ChatNewsCategoryStoreRequest $request, ChatNewsCategoryService $service): JsonResponse
    {
        $category = $service->create($request->validated());
        return Helper::response(trans('messages.successfully_stored'), $category);
    }

    public function update(ChatNewsCategoryStoreRequest $request, ChatNewsCategory $chatNewsCategory, ChatNewsCategoryService $service): JsonResponse
    {
        $category = $service->update($chatNewsCategory, $request->validated());
        return Helper::response(trans('messages.successfully_updated'), $category);
    }

    public function destroy(ChatNewsCategory $chatNewsCategory, ChatNewsCategoryService $service): JsonResponse
    {
        $service->delete($chatNewsCategory);
        return Helper::response(trans('messages.successfully_deleted'));
    }
}
