<?php

namespace Modules\Structure\Http\Controllers;


use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Modules\Structure\Models\ContractAdditionalType;
use Modules\Structure\Transformers\DocumentExample\ContractTypeResource;

class ContractAdditionalTypeController implements HasMiddleware
{
    use Base64FileUploadTrait;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:admin', only: ['store', 'update', 'destroy']),
        ];
    }
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = ContractAdditionalType::query()
            ->FilterOrganization(request()->all())
            ->Search()
            ->with('organization')
            ->paginate($per_page);

        $contractAdditionalTypes = PaginateResource::make($data, ContractTypeResource::class);

        return Helper::response(true, $contractAdditionalTypes);
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required',
            'organizations' => 'required',
            'file' => 'required|mimes:doc,docx'
        ]);

        DB::transaction(function () use ($request) {
            $data['type'] = $request->type;
            $data['file'] = $this->uploadFormFile($request->file('file'), 'contract-additional-types', ['doc', 'docx']);

            $dataAllValues = [];
            $organizations = explode(',', $request->organizations);
            foreach ($organizations as $organization) {
                $dataAllValues[] = array_merge($data, ['organization_id' => $organization]);
            }

            ContractAdditionalType::query()->insert($dataAllValues);
        });

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, ContractAdditionalType $contractAdditionalType): JsonResponse
    {
        $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'type' => 'required'
        ]);

        $data = $request->all();

        DB::transaction(function () use ($request, $contractAdditionalType, $data) {
            if ($request->hasFile('file')) {

                $data['file'] = $this->uploadFormFile($request->file('file'), 'contract-additional-types', ['doc', 'docx']);
            }

            $contractAdditionalType->update($data);
        });

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function destroy(ContractAdditionalType $contractAdditionalType): JsonResponse
    {
        $contractAdditionalType->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
