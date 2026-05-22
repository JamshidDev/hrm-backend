<?php

namespace Modules\Economist\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\Economist\Models\PensionPayment;
use Modules\Economist\Transformers\Statement\PensionPaymentApplicationResource;

class PensionPaymentController extends Controller
{
    public function index(): JsonResponse
    {
        $user = auth()->user();

        $data = PensionPayment::query()
            ->filter($user, request()->all())
            ->where('year', request('year', date('Y')))
            ->where('month', request('month', date('m')))
            ->when(request('search'), function ($query) {
                $query->whereHas('worker', function ($q) {
                    $q->searchByFullName();
                });
            })
            ->with(['worker:id,last_name,first_name,middle_name,photo'])
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($data, PensionPaymentApplicationResource::class);

        return Helper::response(true, $data);
    }

    public function downloadExample(): JsonResponse
    {
        return Helper::response(true, [
            'url' => asset('resumes/economist/pension-payment.xlsx')
        ]);
    }
}
