<?php

namespace App\Http\Controllers\User;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\UseFul\OrganizationLeadersResource;
use Illuminate\Http\JsonResponse;
use Modules\Structure\Models\Organization;

class UsefulController extends Controller
{
    public function codex(): JsonResponse
    {
        if (app()->getLocale() === 'ru') {
            $codex = file_get_contents('resumes/documents/codex_ru.html');
        } else {
            $codex = file_get_contents('resumes/documents/codex.html');
        }

        return Helper::response(true, [
            'codex' => $codex,
        ]);
    }

    public function leaders(): JsonResponse
    {
        $leaders = Organization::query()
            ->with([
                'leaders' => function($query) {
                    $query->whereHas('worker_position');
                },
                'leaders.worker_position:id,worker_id,position_id,department_id,organization_id',
                'leaders.worker_position.department:id,level,name',
                'leaders.worker_position.worker:id,last_name,first_name,middle_name,birthday,photo'
            ])
            ->search()
            ->get()
            ->toTree();

        $data = OrganizationLeadersResource::collection($leaders);

        return Helper::response(true, $data);
    }

}
