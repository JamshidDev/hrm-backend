<?php

namespace App\Http\Controllers\User;
use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Models\MobileVersion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MobileVersionController extends Controller
{
    public function check(Request $request): JsonResponse
    {
        $request->validate([
            'platform' => 'required|in:ios,android',
            'version'  => 'required|string'
        ]);

        $config = MobileVersion::where('platform', $request->platform)
            ->where('is_active', true)
            ->latest()
            ->first();

        if (!$config) {
            return Helper::response();
        }

        $userVersion = $request->version;

        $force = false;
        $updateAvailable = false;

        if (version_compare($userVersion, $config->min_supported_version, '<')) {
            $force = true;
        }

        if (version_compare($userVersion, $config->latest_version, '<')) {
            $updateAvailable = true;
        }
        $text = $updateAvailable ? 'Yangi versiya mavjud.' : null;
        $res = [
            'latest_version'        => $config->latest_version,
            'min_supported_version' => $config->min_supported_version,
            'force_update'          => $force,
            'update_available'      => $updateAvailable,
            'store_url'             => $config->store_url,
            'message'               => $force ? 'Ilovani yangilash majburiy.' : $text
        ];

        return Helper::response(true, $res);
    }
}
