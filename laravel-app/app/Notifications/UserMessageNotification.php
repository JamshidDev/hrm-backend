<?php

namespace App\Notifications;

use AllowDynamicProperties;
use App\Broadcasting\SocketChannel;
use App\Channels\NotificationDatabaseChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

#[AllowDynamicProperties]
class UserMessageNotification extends Notification
{
    use Queueable;

    protected array $data;
    protected int|null $senderId;

    public function __construct(int|null $senderId, $title, $message, $type, $alert, $action = [])
    {
        $this->senderId = $senderId;
        $this->data = [
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'alert' => $alert,
            'action' => $action,
        ];
    }

    public function via(object $notifiable): array
    {
        return [NotificationDatabaseChannel::class, SocketChannel::class];
    }

    public function toArray(object $notifiable): array
    {
        return $this->data;
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'sender_id' => $this->senderId,
            'data' => $this->data,
        ];
    }
}
