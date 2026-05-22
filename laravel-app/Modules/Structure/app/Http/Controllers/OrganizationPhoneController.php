<?php

namespace Modules\Structure\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Structure\Models\OrganizationPhone;
use Modules\Structure\Transformers\Structure\OrganizationPhoneResource;

class OrganizationPhoneController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $user = auth()->user();

        $data = OrganizationPhone::query()
            ->filter($user, request()->all())
            ->search()->paginate($per_page);

        $countries = PaginateResource::make($data, OrganizationPhoneResource::class);

        return Helper::response(true, $countries);
    }

    public function list(): JsonResponse
    {
        $phones = OrganizationPhone::query()
            ->where('organization_id', auth()->user()->organization_id)
            ->get();

        return Helper::response(true, $phones);
    }


    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phones' => 'required|array'
        ]);

        $orgid = auth()->user()->organization->id;

        foreach ($validated['phones'] as $phone) {
            $phone['organization_id'] = $orgid;
            OrganizationPhone::query()
                ->updateOrCreate([
                    'organization_id' => $orgid,
                    'phone' => $phone
                ], $validated);
        }

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, OrganizationPhone $organizationPhone): JsonResponse
    {
        $validated = $request->validate([
            'phone' => 'required'
        ]);

        OrganizationPhone::query()->where([
            'organization_id' => $organizationPhone->organization_id,
            'phone' => $validated['phone']
        ])->forceDelete();

        $organizationPhone->update(['phone' => $validated['phone']]);

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(OrganizationPhone $organizationPhone): JsonResponse
    {
        $organizationPhone->delete();

        return Helper::response(true, trans('messages.successfully_deleted'));
    }
}
