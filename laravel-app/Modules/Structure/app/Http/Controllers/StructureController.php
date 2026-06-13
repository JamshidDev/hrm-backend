<?php

namespace Modules\Structure\Http\Controllers;

use App\Helpers\Helper;
use App\Helpers\QueryHelper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Enums\CommandTypeEnum;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Enums\SchedulesEnum;
use Modules\HR\Enums\UniversityTypeEnum;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionMinimalResource;
use Modules\Integration\Transformers\Position\WorkerPositionMinResource;
use Modules\Structure\Enums\EducationEnum;
use Modules\Structure\Enums\HolidayTypeEnum;
use Modules\Structure\Enums\OrganizationServiceEnum;
use Modules\Structure\Enums\PositionCategoryEnum;
use Modules\Structure\Enums\WorkDayTypeEnum;
use Modules\Structure\Models\Organization;
use Modules\Structure\Transformers\Organization\OrganizationChildResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class StructureController extends Controller
{
    public function index(): JsonResponse
    {
        try {
            $user = auth()->user()->load('roles.permissions', 'organization');

            $matchingNodes = Organization::query()
                ->search()
                ->when(request('organization_id'), function ($query) {
                    $query->where('id', request('organization_id'));
                })
                ->defaultOrder()
                ->get();

            if (!$user->organization_id) {
                return Helper::response(trans('messages.organization_not_found'), [], 400);
            }

            if (count($user->getAllPermissions())) {
                if ($user->hasPermissionTo('organization-admin')) {
                    $children = Organization::query()
                        ->adminOrganizations($matchingNodes)
                        ->defaultOrder()
                        ->get()
                        ->toTree();
                } elseif ($user->hasPermissionTo('organization-leader')) {
                    $children = Organization::query()
                        ->search()
                        ->leaderOrganizations($user)->defaultOrder()->get()->toTree();
                } else {
                    $children = $matchingNodes->where('id', $user->organization_id)->values();
                }
            }

            return Helper::response(true, OrganizationChildResource::collection($children ?? []));
        } catch (\Exception $e) {
            Helper::setLog($e, 'StructureController@index');
            return Helper::response(trans('messages.server_error'), [], 500);
        }
    }

    public function enums(): JsonResponse
    {
        return Helper::response(true, [
            'contract_types' => ContractTypeEnum::list(),
            'organization_services' => OrganizationServiceEnum::list(),
            'categories' => PositionCategoryEnum::list(),
            'schedules' => SchedulesEnum::list(),
            'work_day_types' => WorkDayTypeEnum::list(),
            'command_types' => CommandTypeEnum::list(),
            'confirmation_statuses' => ConfirmationStatusEnum::list(),
            'holiday_types' => HolidayTypeEnum::list(),
            'university_types' => UniversityTypeEnum::list(),
            'education_types' => EducationEnum::list()
        ]);
    }

    public function getAllStructure(): AnonymousResourceCollection
    {
        $matchingNodes = Organization::query()->search();

        $query = new QueryHelper()->adminOrganizations($matchingNodes);
        return OrganizationChildResource::collection($query->defaultOrder()->get()->toTree());
    }

    public function leaders($organizationId): JsonResponse
    {
        $organizationId = (int)$organizationId;
        [$leadIds, $leadDeputyIds] = Helper::leadPositionIds();
        $order = implode(',', $leadIds);
        $leader = WorkerPosition::query()
            ->whereOrganizationId($organizationId)
            ->whereStatus(PositionStatusEnum::ACTIVE->value)
            ->whereIn('position_id', $leadIds)
            ->orderByRaw("array_position(ARRAY[$order], position_id)")
            ->with([
                'organization:id,name,group,full_name',
                'department:id,name,level',
                'position:id,name',
                'worker:id,last_name,first_name,middle_name,photo',
                'worker.phones',
            ])
            ->first();

        $order = implode(',', $leadDeputyIds);

        $deputies = WorkerPosition::query()
            ->whereOrganizationId($organizationId)
            ->whereStatus(PositionStatusEnum::ACTIVE->value)
            ->whereIn('position_id', $leadDeputyIds)
            ->orderByRaw("array_position(ARRAY[$order], position_id)")
            ->with([
                'organization:id,name,group,full_name',
                'department:id,name,level',
                'position:id,name',
            ])
            ->get();

        return Helper::response(true, [
            'leader' => $leader ? new WorkerPositionMinResource($leader) : null,
            'deputies' => $deputies ? WorkerPositionMinResource::collection($deputies) : []
        ]);
    }

    public function leadOrganizations(): JsonResponse
    {
        $user = auth()->user();
        $data = Organization::ancestorsAndSelf($user->organization_id);
        $data = OrganizationListResource::collection($data);
        return Helper::response(true, $data);
    }

    public function parentLeaders(): JsonResponse
    {
        $user = auth()->user();
        $orgIds = Organization::ancestorsAndSelf($user->organization_id)->select('id');
        [$leadIds, $leadDeputyIds] = Helper::leadPositionIds();

        $workers = WorkerPosition::query()
            ->whereIn('position_id', $leadIds)
            ->whereIn('organization_id', $orgIds)
            ->with([
                'worker:id,last_name,first_name,middle_name,photo',
                'organization:id,name,group,full_name',
                'department:id,name,level',
                'position:id,name',
            ])
            ->paginate(request('per_page', 50));

        $data = PaginateResource::make($workers, WorkerPositionMinimalResource::class);

        return Helper::response(true, $data);
    }

    public function confirmations(): JsonResponse
    {
        [$leadIds, $leadDeputyIds] = Helper::leadPositionIds();

        $workers = WorkerPosition::query()
            ->whereIn('position_id', $leadIds)
            ->with([
                'worker:id,last_name,first_name,middle_name,photo',
                'organization:id,name,group,full_name',
                'department:id,name,level',
                'position:id,name',
            ])
            ->paginate(request('per_page', 50));

        $data = PaginateResource::make($workers, WorkerPositionMinimalResource::class);

        return Helper::response(true, $data);
    }

}
