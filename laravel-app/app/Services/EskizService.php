<?php

namespace App\Services;

use App\Helpers\Helper;
use App\Models\MessageArchive;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Http;

class EskizService
{
    public static function sendMessage($user, $messageText): array
    {
        try {

            $c = config('services.eskiz');

            if (!$c['token'] || Carbon::parse($c['expired']) < now()) {

                $res = self::createToken($c);

                if (!$res['status']) {
                    return $res;
                }

                $c = $res['message'];
            }

            $messageData = [
                'mobile_phone' => '998' . $user->phone,
                'message' => $messageText,
                'from' => 4546
            ];

            $sendMessage = Http::timeout(5)
                ->withToken($c['token'])
                ->post('https://notify.eskiz.uz/api/message/sms/send', $messageData);


            if ($sendMessage->failed()) {
                return [
                    'status' => false,
                    'message' => $sendMessage['message']
                ];
            }

            MessageArchive::query()->create([
                'user_id' => $user->id,
                'type' => 'otp',
                'message' => $messageText
            ]);

            return [
                'status' => true,
                'message' => trans('messages.otp.message_successfully_sent')
            ];

        } catch (Exception $exception) {
            return [
                'status' => false,
                'message' => $exception->getMessage()
            ];
        }
    }

    public static function createToken($c): array
    {
        try {
            $authData = ['email' => $c['email'], 'password' => $c['password']];

            $res = Http::post('https://notify.eskiz.uz/api/auth/login', $authData);

            if ($res->failed()) {
                return [
                    'status' => false,
                    'message' => trans('messages.otp.service_create_token_error')
                ];
            }

            $c['token'] = $res['data']['token'];
            $c['expired'] = now()->addDay(60);

            Helper::writeOrAppendEnvValue('ESKIZ_TOKEN', '"' . ($c['token']) . '"');
            Helper::writeOrAppendEnvValue('ESKIZ_EXPIRED', '"' . ($c['expired']) . '"');

            return [
                'status' => true,
                'message' => $c
            ];

        } catch (Exception $exception) {
            return [
                'status' => false,
                'message' => $exception->getMessage()
            ];
        }
    }
}
