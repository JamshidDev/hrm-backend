<?php

namespace App\Http\Controllers\Telegram;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Telegram\TelegramCheckRequest;
use App\Http\Requests\Telegram\TelegramDetachRequest;
use App\Http\Requests\Telegram\TelegramIndexRequest;
use App\Http\Requests\Telegram\TelegramRegisterRequest;
use App\Http\Requests\Telegram\TelegramTerminalPhotoRequest;
use App\Services\Telegram\TelegramPhotoService;
use App\Services\Telegram\TelegramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramController extends Controller
{
    public function __construct(
        private readonly TelegramService $telegram,
        private readonly TelegramPhotoService $photo,
    ) {
    }

    public function index(TelegramIndexRequest $request): JsonResponse
    {
        return Helper::response(true, $this->telegram->paginateAccounts($request->validated()));
    }

    public function register(TelegramRegisterRequest $request): JsonResponse
    {
        $this->telegram->register(
            $request->validated('uuid'),
            $request->validated('chat_id'),
        );

        return Helper::response(trans('messages.user_has_been_registered'));
    }

    public function check(TelegramCheckRequest $request): JsonResponse
    {
        return Helper::response(
            true,
            $this->telegram->check($request->validated('phone'), $request->validated('pin'))
        );
    }

    public function destroy(string $chatId): JsonResponse
    {
        $this->telegram->deactivate($chatId);

        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function getUserInfo(string $chatId): JsonResponse
    {
        return Helper::response(true, $this->telegram->userInfoByChatId($chatId));
    }

    public function services(Request $request): JsonResponse
    {
        return Helper::response(true, $this->telegram->listServices($request->user()));
    }

    public function getService(Request $request): JsonResponse
    {
        $user = $request->user();

        return match ($request->input('service')) {
            md5('hcp_devices') => Helper::response(true, $this->telegram->hcpDevices($user, $request->all())),
            md5('salary_months') => response()->json($this->telegram->salaryMonths($user)),
            md5('salary') => response()->json($this->telegram->salary(
                $user,
                $request->input('year'),
                $request->input('month'),
                $request->all(),
            )),
            md5('terminal-photo') => $this->respondPhotoUpload($request),
            md5('user-verify-photos') => Helper::response(true, $this->photo->verifyPhoto($user)),
            md5('user-process-photos') => Helper::response(true, $this->photo->processPhoto($user)),
            md5('user-terminal-logs') => Helper::response(
                true,
                $this->telegram->terminalLogs($user, $request->input('date'), $request->all())
            ),
            md5('user-med-histories') => Helper::response(true, $this->telegram->medHistories($user, $request->all())),
            md5('user-petitions') => Helper::response(true, $this->telegram->medHistories($user)),
            default => Helper::response(),
        };
    }

    public function setServices(Request $request): JsonResponse
    {
        return match ($request->input('service')) {
            md5('terminal-photo') => $this->respondPhotoUpload($request),
            default => Helper::response(),
        };
    }

    public function getUserPetitions(Request $request): JsonResponse
    {
        return Helper::response(true, $this->telegram->medHistories($request->user()));
    }

    public function petitionTypes(): JsonResponse
    {
        return Helper::response(true, $this->telegram->petitionTypes());
    }

    public function getMedHistories(Request $request): JsonResponse
    {
        return Helper::response(
            true,
            $this->telegram->medHistories($request->user(), $request->all())
        );
    }

    public function terminalLogs(Request $request): JsonResponse
    {
        return Helper::response(
            true,
            $this->telegram->terminalLogs($request->user(), $request->input('date'), $request->all())
        );
    }

    public function sendPhotoForTerminal(TelegramTerminalPhotoRequest $request): JsonResponse
    {
        return $this->respondPhotoUpload($request);
    }

    public function userVerifyPhotos(Request $request): JsonResponse
    {
        return Helper::response(true, $this->photo->verifyPhoto($request->user()));
    }

    public function userProcessPhotos(Request $request): JsonResponse
    {
        return Helper::response(true, $this->photo->processPhoto($request->user()));
    }

    public function userCheckSalaryMonth(Request $request): JsonResponse
    {
        return response()->json($this->telegram->salaryMonths($request->user()));
    }

    public function userSalary(Request $request): JsonResponse
    {
        return response()->json($this->telegram->salary(
            $request->user(),
            $request->input('year'),
            $request->input('month'),
            $request->all(),
        ));
    }

    public function userHcpDevices(Request $request): JsonResponse
    {
        return Helper::response(
            true,
            $this->telegram->hcpDevices($request->user(), $request->all())
        );
    }

    public function profile(Request $request): JsonResponse
    {
        return Helper::response(true, $this->telegram->profile($request->user()));
    }

    public function detachUsers(TelegramDetachRequest $request): JsonResponse
    {
        $this->telegram->detachMany($request->validated('chat_ids'));

        return Helper::response(trans('messages.successfully_detached'));
    }

    private function respondPhotoUpload(Request $request): JsonResponse
    {
        $request->validate(['url' => 'required|string']);

        $result = $this->photo->uploadTerminalPhoto($request->user(), $request->input('url'));

        return Helper::response($result['message'], $result['data']);
    }
}
