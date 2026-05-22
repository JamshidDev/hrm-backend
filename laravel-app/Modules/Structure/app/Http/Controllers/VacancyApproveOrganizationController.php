<?php

namespace Modules\Structure\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Structure\Models\VacancyApproveOrganization;
use Modules\Structure\Transformers\VacancyApprove\OrganizationApproveResource;

class VacancyApproveOrganizationController extends Controller
{

    public function index(Request $request)
    {
        $organizations = VacancyApproveOrganization::query()
            ->with([
                'from_organization',
                'to_organization',
            ])
            ->paginate($request->per_page ?? 10);
        $data = PaginateResource::make($organizations, OrganizationApproveResource::class);
        return Helper::response(true, $data);
    }


    public function attach(Request $request)
    {
        $data = $request->validate([
            'from_organization_id' => ['required', 'integer'],
            'to_organization_ids' => ['required', 'array'],
            'to_organization_ids.*' => ['integer'],
        ]);

        DB::transaction(function () use ($data) {
            VacancyApproveOrganization::where('from_organization_id', $data['from_organization_id'])
                ->delete();

            $insertData = array_map(function ($toId) use ($data) {
                return [
                    'from_organization_id' => $data['from_organization_id'],
                    'to_organization_id' => $toId
                ];
            }, $data['to_organization_ids']);

            VacancyApproveOrganization::insert($insertData);
        });

        return Helper::response(trans('messages.successfully_attached'));
    }


    public function destroy($id)
    {
        VacancyApproveOrganization::find($id)?->delete();
        return Helper::response(trans('messages.successfully_deleted'));
    }
}
