<?php

namespace Modules\Confirmation\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\Confirmation\Models\LmsCertificateConfirmation;
use Modules\Confirmation\Transformers\LmsCertificateConfirmationResource;

class LmsCertificateConfirmationController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $user = auth()->user();
        $confirmations = LmsCertificateConfirmation::query()
            ->filter($user, request()->all())
            ->with([
                'certificate.organization',
                'certificate.worker_position',
                'certificate.worker_position.worker:id,first_name,last_name,middle_name,photo',
                'certificate.worker_position.organization',
                'certificate.worker_position.department:id,name,level',
                'certificate.worker_position.position:id,name'
            ])
            ->when(request('search'), function ($query) {
                $search = request('search');

                $query->where(function ($q) use ($search) {
                    $q->whereHas('certificate', function ($q) use ($search) {
                        $q->whereLike('number', "%{$search}%");
                    })->orWhereHas('certificate.worker', function ($q) use ($search) {
                            $q->searchByFullName();
                        });
                });
            })
            ->orderByDesc('id')
            ->paginate($per_page);

        $data = PaginateResource::make($confirmations, LmsCertificateConfirmationResource::class);
        return Helper::response(true, $data);
    }

}
