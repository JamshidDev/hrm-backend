<?php

namespace Modules\Vacancy\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Services\EskizService;
use App\Services\UserService;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Modules\HR\Enums\EducationEnum;
use Modules\HR\Enums\MaritalStatusEnum;
use Modules\HR\Transformers\Nationality\NationalityResource;
use Modules\Structure\Transformers\Structure\OnlyCityResource;
use Modules\Structure\Transformers\Structure\OnlyCountryResource;
use Modules\Structure\Transformers\Structure\RegionMinimalResource;
use Modules\Vacancy\Models\VacancyUser;

class VacancyUserController extends Controller
{
    use Base64FileUploadTrait;

    public function __construct(protected UserService $userService)
    {
    }

    public function login(Request $request): JsonResponse
    {
        $loginUserData = $request->validate([
            'phone' => 'required|min:9|max:9',
            'password' => 'required|min:8'
        ]);

        $user = VacancyUser::query()
            ->where('phone', $loginUserData['phone'])
            ->first();

        if (!$user || !Hash::check($loginUserData['password'], $user->password)) {
            return response()->json([
                'message' => trans('messages.invalid_credentials')
            ], 401);
        }

        $token = $user->createToken('vacancy')->plainTextToken;

        $this->userService->authenticationLog($user, 'login');

        return Helper::response(trans('messages.auth.login_success'), ['access_token' => $token]);
    }

    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'password' => 'required|min:8',
            'otp' => 'required',
            'token' => 'required|uuid'
        ]);

        $user = VacancyUser::query()->where('uuid', $request->token)->first();

        if (!$user) {
            return Helper::response(trans('messages.user_not_found'), [], 400);
        }

        if ($user->phone_verified_at <= now()) {
            return Helper::response(trans('messages.otp.otp_code_invalid'), [], 400);
        }

        if ($user->is_verified) {
            return Helper::response(trans('messages.user_all_ready'), [], 400);
        }

        if (!Hash::check($request->otp, $user->password)) {
            return Helper::response(trans('messages.otp_code_not_verified'), [], 400);
        }

        $user->update([
            'password' => bcrypt($request->password),
            'is_verified' => true
        ]);

        $token = $user->createToken('vacancy')->plainTextToken;

        return Helper::response(true, ['access_token' => $token,]);
    }

    public function sendOtp(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|min:9|max:9',
            'last_name' => 'required',
            'first_name' => 'required',
            'middle_name' => 'required',
        ]);

        $user = VacancyUser::query()->where('phone', $request->phone)->first();

        $code = random_int(111111, 999999);

        if ($user) {
            if ($user->is_verified) {
                return Helper::response(trans('messages.user_all_ready'), [], 400);
            }
            if ($user->phone_verified_at > now()) {
                return Helper::response(trans('messages.sms_code_all_ready'), [], 400);
            }

            $user->update([
                'password' => Hash::make($code),
                'phone' => $request->phone,
                'last_name' => $request->last_name,
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
            ]);

        } else {

            $user = VacancyUser::query()->create([
                'password' => Hash::make($code),
                'phone' => $request->phone,
                'last_name' => $request->last_name,
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
            ]);
        }

        $text = "KODNI HECH KIMGA BERMANG! Uni faqat firibgarlar so'raydi. “Oʻzbekiston temir yoʻllari” AJ Vacancy tizimiga kirish uchun kod: " . $code;

        $sendMessage = EskizService::sendMessage($user, $text);

        if (!$sendMessage['status']) {
            return Helper::response($sendMessage['message'], [], 400);
        }
        $user->update(['phone_verified_at' => now()->addMinute(2)]);

        return Helper::response(true, ['user' => $user->uuid]);
    }

    public function profile(Request $request): JsonResponse
    {
        $user = $request->user('vacancy')->load([
            'country',
            'region',
            'city',
            'current_region',
            'current_city',
            'nationality'
        ]);

        return Helper::response(true, [
            'phone' => $user->phone,
            'uuid' => $user->uuid,
            'last_name' => $user->last_name,
            'first_name' => $user->first_name,
            'middle_name' => $user->middle_name,
            'birthday' => $user->birthday,
            'pin' => $user->pin,
            'photo' => Helper::fileUrl($user->photo),
            'country' => $user->country ? new OnlyCountryResource($user->country) : null,
            'region' => $user->region ? new RegionMinimalResource($user->region) : null,
            'city' => $user->city ? new OnlyCityResource($user->city) : null,
            'current_region' => $user->current_region ? new RegionMinimalResource($user->current_region) : null,
            'current_city' => $user->current_city ? new OnlyCityResource($user->current_city) : null,
            'address' => $user->address,
            'sex' => $user->sex,
            'nationality' => $user->nationality ? new NationalityResource($user->nationality) : null,
            'languages' => $user->languages,
            'marital_status' => [
                'id' => $user->marital_status,
                'name' => MaritalStatusEnum::get($user->marital_status)
            ],
            'education' => [
                'id' => (int)$user->education,
                'name' => EducationEnum::get($user->education)
            ],
        ]);
    }

    public function updatePhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        $user = $request->user('vacancy');

        $user->photo = $this->uploadFormFile($request->photo, 'vacancy-user-photos', ['jpg', 'jpeg', 'png']);
        $user->save();

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sex' => 'boolean',
            'birthday' => 'date',
            'education' => 'required',
            'country_id' => 'required',
            'city_id' => 'required',
            'marital_status' => 'required',
            'region_id' => 'required',
            'current_city_id' => 'required',
            'current_region_id' => 'required',
            'address' => 'required',
            'nationality_id' => 'required',
            'pin' => 'required',
            'languages' => 'required|array',
            'last_name' => 'required',
            'first_name' => 'required',
            'middle_name' => 'required',
        ]);

        $user = $request->user('vacancy');
        $user->update($validated);

        return Helper::response(trans('messages.successfully_stored'));
    }


}
