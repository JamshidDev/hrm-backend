<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\HR\DTO\OrganizationDocumentDTO;
use Modules\HR\Http\Requests\OrganizationDocument\OrganizationDocumentIndexRequest;
use Modules\HR\Http\Requests\OrganizationDocument\OrganizationDocumentStoreRequest;
use Modules\HR\Http\Requests\OrganizationDocument\OrganizationDocumentUpdateRequest;
use Modules\HR\Models\OrganizationDocument;
use Modules\HR\Services\OrganizationDocumentService;
use Modules\HR\Transformers\OrganizationDocument\OrganizationDocumentResource;

class OrganizationDocumentController implements HasMiddleware
{
    public function __construct(
        protected OrganizationDocumentService $service
    )
    {
    }

    public static function middleware(): array
    {
        return [
            new Middleware('can:organization-documents', only: ['store', 'update', 'destroy'])
        ];
    }

    public function index(OrganizationDocumentIndexRequest $request): JsonResponse
    {
        $documents = OrganizationDocument::query()
            ->visibleToUser(auth()->user())
            ->with('organization:id,name,name_en,name_ru,group')
            ->latest()
            ->paginate($request->per_page ?? 10);

        return Helper::response(true, PaginateResource::make($documents, OrganizationDocumentResource::class));
    }

    public function store(OrganizationDocumentStoreRequest $request): JsonResponse
    {
        $dto = OrganizationDocumentDTO::fromRequest($request->validated());
        $this->service->store($dto);

        return Helper::response(trans('messages.document.created'));
    }

    public function update(
        OrganizationDocumentUpdateRequest $request,
        OrganizationDocument              $organizationDocument
    ): JsonResponse
    {
        $dto = OrganizationDocumentDTO::fromRequest($request->validated());
        $this->service->update($organizationDocument, $dto);

        return Helper::response(trans('messages.document.updated'));
    }

    public function destroy(OrganizationDocument $organizationDocument): JsonResponse
    {
        $this->service->delete($organizationDocument);

        return Helper::response('Document deleted');
    }
}
