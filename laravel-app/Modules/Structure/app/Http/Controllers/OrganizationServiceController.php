<?php

namespace Modules\Structure\Http\Controllers;


use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\Structure\Models\OrganizationService;

class OrganizationServiceController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:admin', only: ['store']),
        ];
    }
    public function index()
    {
        $organizationId = request('organization_id');

        $services = OrganizationService::where('organization_id', $organizationId)->get();

        return Helper::response(true,Helper::organizationServices($services));
    }

    public function store(Request $request)
    {
        $request->validate([
            'organization_id' => 'required|integer|exists:organizations,id',
            'key' => 'required',
            'active' => 'boolean',
        ]);

        $data = $request->all();

        OrganizationService::updateOrCreate(
            ['organization_id' => $data['organization_id']],
            [
                'key' => $data['key'],
                'active' => $data['active'],
            ]
        );

        return Helper::response(trans('messages.success_created'));
    }


}
