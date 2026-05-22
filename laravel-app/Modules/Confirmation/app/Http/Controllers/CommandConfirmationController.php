<?php

namespace Modules\Confirmation\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Models\CommandConfirmation;
use Modules\Confirmation\Transformers\CommandConfirmationResource;

class CommandConfirmationController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);
        $user = auth()->user();
        $confirmations = CommandConfirmation::query()
            ->filter($user, request()->all())
            ->with([
                'command.organization',
                'command.confirmations'
            ])
            ->whereHas('command', function ($query) {
                $query->where('confirmation', '!=', ConfirmationStatusEnum::SUCCESS->value);
            })
            ->orderByDesc('id')
            ->paginate($per_page);

        $data = PaginateResource::make($confirmations, CommandConfirmationResource::class);

        return Helper::response(true, $data);
    }

}
