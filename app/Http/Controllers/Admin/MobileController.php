<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\MobileResource;
use App\Http\Resources\PaginateResource;
use App\Models\LivenessSession;
use App\Models\UserMobileKey;
use Illuminate\Http\JsonResponse;

class MobileController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = UserMobileKey::query()
            ->when(request('search'), function ($query, $search) {
                $query->whereHas('user.worker', fn($q) => $q->searchByFullName($search));
            })
            ->with('user.worker')
            ->orderByDesc('created_at')
            ->paginate($per_page);

        $roles = PaginateResource::make($data, MobileResource::class);
        return Helper::response(true, $roles);
    }

    public function show($id): JsonResponse
    {
        $device = UserMobileKey::findOrFail($id);
        $sessions = LivenessSession::query()
            ->where('user_id', $device->user_id)
            ->with('photos')
            ->get()
            ->map(function ($item) {
                if ($item->face_status) {
                    $photos = [];
                    if ($item->refImage) {
                        $photos[] = Helper::fileUrl($item->refImage);
                    }
                    if ($item->liveImage) {
                        $photos[] = Helper::fileUrl($item->liveImage);
                    }
                } else {
                    $photos = $item->photos->map(fn($p) => Helper::fileUrl($p->photo));
                }
                return [
                    'id' => $item->id,
                    'status' => $item->status,
                    'success' => $item->success,
                    'created_at' => $item->created_at->format('Y-m-d H:i:s'),
                    'photos' => $photos
                ];
            });

        return Helper::response(true, [
            'device' => new MobileResource($device),
            'sessions' => $sessions
        ]);
    }

}
