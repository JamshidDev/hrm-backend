<?php

namespace Modules\Chat\Services;

use App\Traits\Base64FileUploadTrait;
use Modules\Chat\Models\ChatNewsMedia;

class ChatNewsMediaService
{
    use Base64FileUploadTrait;
    public function create(array $data)
    {
        $file = $data['file'];
        $filePath = $this->uploadFormFile($file, 'chat-media', ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'mp4', 'mpeg','avi']);
        $data['path'] = $filePath;
        $data['extension'] = $file->getClientOriginalExtension();
        $data['size'] = $file->getSize();
        return ChatNewsMedia::create($data);
    }

    public function delete(ChatNewsMedia $media): void
    {
        $media->delete();
    }
}
