<?php

namespace App\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use App\Http\Resources\QuoteResource;
use App\Models\Quote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class QuoteController implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:admin', only: ['store', 'update', 'destroy']),
        ];
    }
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $quotes = Quote::query()->paginate($per_page);
        $data = PaginateResource::make($quotes, QuoteResource::class);

        return Helper::response(true, $data);
    }

    public function inRandomQuote(): JsonResponse
    {
        $quote = Quote::query()->inRandomOrder()->firstOrFail();
        return Helper::response(true, new QuoteResource($quote));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'text.uz' => 'required|string',
            'text.ru' => 'required|string',
            'text.en' => 'required|string',
            'author.uz' => 'required|string',
            'author.ru' => 'required|string',
            'author.en' => 'required|string',
        ]);

        Quote::create($validated);
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(Request $request, Quote $quote): JsonResponse
    {
        $validated = $request->validate([
            'text.uz' => 'sometimes|string',
            'text.ru' => 'sometimes|string',
            'text.en' => 'sometimes|string',
            'author.uz' => 'sometimes|string',
            'author.ru' => 'sometimes|string',
            'author.en' => 'sometimes|string',
        ]);

        $quote->update($validated);
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy(Quote $quote): JsonResponse
    {
        $quote->delete();
        return Helper::response(trans('messages.successfully_deleted'));
    }

}
