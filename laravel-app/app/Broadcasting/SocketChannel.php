<?php

namespace App\Broadcasting;

use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Redis;

class SocketChannel
{
    /**
     * Create a new channel instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Authenticate the user's access to the channel.
     */
    public function join(User $user): array|bool
    {
        //
    }

    public function send($notifiable, Notification $notification): void
    {
        $data = $notification->toArray($notifiable);
        $userId = $notifiable->id;
        $data['id'] = $notification->id;
        $msgData = json_encode(['userId' => $userId, 'data' => $data], JSON_THROW_ON_ERROR);
        Redis::publish('notifications', $msgData);
    }
}
