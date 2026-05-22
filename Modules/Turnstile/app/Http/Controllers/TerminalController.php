<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Turnstile\Models\Terminal;
use Modules\Turnstile\Transformers\TerminalResource;

class TerminalController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = Terminal::query()->search()->with('building')->paginate($per_page);

        $countries = PaginateResource::make($data, TerminalResource::class);

        return Helper::response(true, $countries);
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'building_id' => 'required',
            'name'        => 'required',
            'ip_address'  => 'required|ipv4'
        ]);

        $data = $request->all();
        $data['id'] = Terminal::query()->max('id') + 1;

        Terminal::query()->create($data);

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, Terminal $terminal): JsonResponse
    {
        $request->validate([
            'building_id' => 'sometimes|required',
            'name'        => 'sometimes|required',
            'ip_address'  => 'sometimes|required|ipv4'
        ]);

        $terminal->update($request->all());

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(Terminal $terminal): JsonResponse
    {
        $terminal->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
