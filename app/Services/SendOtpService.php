<?php

namespace App\Services;

use App\Models\OtpService;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\Http;

class SendOtpService
{
    public static function send($user, $messageText): array
    {
        try {
            $otpService = OtpService::query()
                ->where('status', true)->first();

            if (!$otpService) {
                return [
                    'status' => false,
                    'message' => trans('messages.otp.service_not_found')
                ];
            }

            $service = $otpService->key;

            if ($service === 'Eskiz') {
                return EskizService::sendMessage($otpService, $user, $messageText);
            }

            return [
                'status' => false,
                'message' => trans('messages.otp.service_not_found')
            ];

        } catch (Exception $exception) {
            return [
                'status' => false,
                'message' => $exception->getMessage()
            ];
        }
    }
}
