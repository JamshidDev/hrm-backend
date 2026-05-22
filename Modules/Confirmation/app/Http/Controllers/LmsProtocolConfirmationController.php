<?php

namespace Modules\Confirmation\Http\Controllers;


use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\Confirmation\Models\LmsProtocolConfirmation;
use Modules\Confirmation\Transformers\CommandConfirmationResource;

class LmsProtocolConfirmationController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $user = auth()->user();
        $confirmations = LmsProtocolConfirmation::query()
            ->filter($user, request()->all())
            ->with([
                'protocol.organization',
                'protocol.confirmations'
            ])
            ->orderByDesc('id')
            ->paginate($per_page);

        $data = PaginateResource::make($confirmations, CommandConfirmationResource::class);

        return Helper::response(true, $data);
    }

}
