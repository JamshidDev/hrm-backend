<?php

namespace Modules\LMS\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Services\ZoomService;
use Illuminate\Http\JsonResponse;
use Modules\LMS\Models\Lesson;

class LessonMeetController extends Controller
{

    protected ZoomService $zoom;

    public function __construct(ZoomService $zoom)
    {
        $this->zoom = $zoom;
    }

    public function createZoomMeeting(Lesson $lesson): JsonResponse
    {
        // Agar oldin yaratilgan bo'lsa, qaytarish
        if ($lesson->zoom_meeting_id) {
            return Helper::response(true, [
                'meeting_id' => $lesson->zoom_meeting_id,
                'join_url' => $lesson->zoom_join_url,
                'zoom_start_url' => $lesson->start_url,
                'zoom_password' => $meeting['password'] ?? null
            ]);
        }

        // Zoom meeting yaratish
        $meeting = $this->zoom->createMeeting($lesson);

        // DB-ga saqlash
        $lesson->update([
            'zoom_meeting_uuid' => $meeting['uuid'],
            'zoom_meeting_id' => $meeting['id'],
            'zoom_start_url' => $meeting['start_url'],
            'zoom_join_url' => $meeting['join_url'],
            'zoom_password' => $meeting['password'] ?? null
        ]);

        return Helper::response(true, $meeting);
    }

    public function showParticipants(Lesson $lesson): ?JsonResponse
    {
        $meetingUUID = "dAoeKhTDRLevANMCObQAFg==";
        $participants = $this->zoom->getPastMeetingParticipants($meetingUUID);

        return Helper::response(true, $participants);
    }

}
