<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\Middleware;
use Modules\HR\Models\OrganizationPolyclinic;
use Modules\Med\Transformers\OrganizationPolyclinicResource;

class OrganizationPolyclinicController extends Controller
{
    public static function middleware(): array
    {
        return [
            new Middleware('can:polyclinics-write', only: ['destroy', 'store', 'update'])
        ];
    }

    public function index(): JsonResponse
    {
        $user = auth()->user();

        $pols = OrganizationPolyclinic::query()
            ->where('organization_id', $user->organization_id)
            ->with('polyclinic')
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($pols, OrganizationPolyclinicResource::class);

        return Helper::response(true, $data);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'polyclinics' => 'required|array',
        ]);

        $org = auth()->user()
            ->load('organization.polyclinics')
            ->organization;
        $polyclinicIds = $org->polyclinics->pluck('id')->toArray();
        $polyclinicIds = array_merge($polyclinicIds, $request->polyclinics);
        $org->polyclinics()->sync($polyclinicIds);

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function destroy($id): JsonResponse
    {
        OrganizationPolyclinic::withTrashed()->find($id)?->forceDelete();
        return Helper::response(trans('messages.successfully_deleted'));
    }
}
