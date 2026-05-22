<?php

namespace Modules\Chat\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\Request;
use Modules\Chat\Http\Requests\ChatNews\ChatNewsIndexRequest;
use Modules\Chat\Http\Requests\ChatNews\ChatNewsStoreRequest;
use Modules\Chat\Models\ChatNews;
use Modules\Chat\Services\ChatNewsService;
use Modules\Chat\Transformers\Chat\ChatNewsResource;

class ChatNewsController extends Controller
{
    public function index(Request $request): \Illuminate\Http\JsonResponse
    {
        $news = ChatNews::with('categories')
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->paginate(request('per_page') ?? 10);

        $data = PaginateResource::make($news, ChatNewsResource::class);
        return Helper::response(true, $data);
    }

    public function list(ChatNewsIndexRequest $request, ChatNewsService $service): \Illuminate\Http\JsonResponse
    {
        $news = $service->list($request, auth()->id());
        return Helper::response(true, $news);
    }

    public function show($newId): \Illuminate\Http\JsonResponse
    {
        $news = ChatNews::with('categories')->findOrFail($newId);
        $data = new ChatNewsResource($news);

        return Helper::response(true, $data);
    }


    public function store(ChatNewsStoreRequest $request, ChatNewsService $service): \Illuminate\Http\JsonResponse
    {
        $user = auth()->user();
        $service->store($request->validated(), $user);
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(ChatNewsStoreRequest $request, $chatNewsId, ChatNewsService $service): \Illuminate\Http\JsonResponse
    {
        $chatNews = ChatNews::query()->findOrFail($chatNewsId);
        $user = auth()->user();
        $service->update($chatNews, $request->validated(),$user);
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($chatNewsId, ChatNewsService $service): \Illuminate\Http\JsonResponse
    {
        $service->delete(ChatNews::query()->findOrFail($chatNewsId));
        return Helper::response(trans('messages.successfully_deleted'));
    }
}
