<?php

namespace App\Services;

use App\Traits\Base64FileUploadTrait;
use Exception;
use Illuminate\Support\Facades\Http;

class TerminalService
{
    use Base64FileUploadTrait;

    public static function addToTerminal($url, $devices, $employee, $card, $full_name, $photo, $to): array
    {
        try {
            $request = Http::acceptJson()->post($url, [
                "action"        => "add",
                "ips"           => $devices,
                "employee_no" => (string)$employee,
                "name"          => $full_name,
                "card"          => (string)$card,
                "right"         => "1",
                "finger"        => "",
                "fingerprint"   => "",
                "face"          => $photo,
                "valid_from_dt" => now()->format('Y-m-d H:i:s'),
                "valid_to_dt"   => $to
            ]);

            return [
                'status' => true,
                'request' => $request->json()
            ];
        } catch (Exception $e) {
            return [
                'status'  => false,
                'message' => $e->getMessage()
            ];
        }
    }

    public static function deleteUserTerminal($url, $card, $ip): array
    {
        try {
            $request = Http::acceptJson()->post($url, [
                "action" => "delete",
                "ip"     => $ip,
                "card"   => $card,
            ]);

            return [
                'status' => true,
                'request' => $request->json()
            ];
        } catch (Exception $e) {
            return [
                'status'  => false,
                'message' => $e->getMessage()
            ];
        }
    }


    public static function getEvents($url, $ip, $startDateTime, $endDateTime): array
    {
        try {
            $request = Http::acceptJson()
                ->timeout(10)
                ->post($url, [
                    "action" => "event_log",
                    "ip" => $ip,
                    "event_start" => $startDateTime,
                    "event_end" => $endDateTime,
                ]);

            return [
                'status' => true,
                'request' => $request->json()
            ];
        } catch (Exception $e) {
            return [
                'status' => false,
                'message' => $e->getMessage()
            ];
        }
    }
}
