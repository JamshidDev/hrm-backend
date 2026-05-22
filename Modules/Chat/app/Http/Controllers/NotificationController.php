<?php

namespace Modules\Chat\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Models\User;
use App\Notifications\UserMessageNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Notification;
use Modules\Chat\Enums\NotificationTypeEnum;
use Modules\Chat\Transformers\Notifications\NotificationsListResource;

class NotificationController extends Controller
{
    public function index(): JsonResponse
    {
        $notifications = DatabaseNotification::latest('created_at')
            ->with([
                'notifiable',
                'notifiable.worker:id,last_name,first_name,middle_name,photo'
            ])
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($notifications, NotificationsListResource::class);

        return Helper::response(true, $data);
    }

    public function send(Request $request): JsonResponse
    {
        $request->validate([
            'userId' => 'required|exists:users,id',
            'title' => 'required|string',
            'type' => 'required|string',
            'message' => 'required|string'
        ]);

        $toUser = User::findOrFail($request->userId);

        Notification::send($toUser, new UserMessageNotification(
            auth()->id(),
            $request->title,
            $request->message,
            $request->type,
            $request->alert ?? 'info',
            $request->action ?? []
        ));
        return Helper::response(trans('messages.chat.notifications.send_success'));
    }

    public function sendBatch(Request $request): JsonResponse
    {
        $request->validate([
            'filter' => 'required',
            'filter.userIds' => 'required|array',
            'title' => 'required|string',
            'message' => 'required|string'
        ]);

        if (array_key_exists('all', $request->filter) && $request->filter['all']) {
            $toUsers = User::whereNotIn('id', $request->filter['unCheck'])->get();
        } else {
            $toUsers = User::whereIn('id', $request->filter['userIds'])->get();
        }

        Notification::send($toUsers, new UserMessageNotification(
            auth()->id(),
            $request->title,
            $request->message,
            $request->type,
            $request->alert ?? 'info',
            $request->action ?? []
        ));
//        SendBatchNotificationsJob::dispatch();
        return Helper::response(trans('messages.chat.notifications.send_success'));
    }

    public function enums(): JsonResponse
    {
        return Helper::response(true, [
            'notificationTypes' => NotificationTypeEnum::list(),
        ]);
    }

}
